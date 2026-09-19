import mongoose from "mongoose";
import { Migration, MigrationContext, register } from "@/lib/migrations";
import { guessProviderType } from "@/lib/providers";

/**
 * 001-initial: bring a legacy database up to the schema in lib/models.ts.
 *
 *  - servers.virtfusionId  => providerServerId
 *  - servers.userId (string) => ownerId (ObjectId) + ownerEmail/ownerName backfill
 *  - users.emailLower backfill (duplicate-casing email conflicts are reported,
 *    never silently merged)
 *  - providerType classification for legacy records (manual vs virtfusion)
 *  - initial ServerAssignment rows for every strongly-owned server
 *
 * Does NOT build indexes — lib/mongodb.ts verifyIndexes() does that on boot.
 */
const migration: Migration = {
    id: "001-initial",
    name: "Initial schema migration (virtfusionId -> providerServerId, ownership, roles)",
    async up(ctx: MigrationContext) {
        const { db, report, isDryRun } = ctx;

        // ── 1. providerServerId from virtfusionId ────────────────────────
        const serversCol = db.collection("servers");
        const rawServers = await serversCol.find({}).toArray();

        let renamed = 0;
        let noProviderId = 0;
        for (const s of rawServers as any[]) {
            const hasProvider = s.providerServerId && String(s.providerServerId).length > 0;
            const hasLegacy = s.virtfusionId != null && String(s.virtfusionId).length > 0;
            if (hasProvider) {
                if (hasLegacy) {
                    await serversCol.updateOne({ _id: s._id }, { $unset: { virtfusionId: "" } });
                }
                continue;
            }
            if (hasLegacy) {
                renamed += 1;
                if (!isDryRun) {
                    await serversCol.updateOne(
                        { _id: s._id },
                        { $set: { providerServerId: String(s.virtfusionId) }, $unset: { virtfusionId: "" } }
                    );
                }
            } else {
                noProviderId += 1;
            }
        }
        report(`1. provider ids: ${renamed} renamed virtfusionId -> providerServerId; ${noProviderId} records have no provider id (left for manual review).`);

        // ── 2. ownerId from userId ───────────────────────────────────────
        const usersCol = db.collection("users");
        const usersById = new Map<string, any>();
        for (const u of (await usersCol.find({}).toArray()) as any[]) {
            usersById.set(String(u._id), u);
        }

        let ownersConverted = 0;
        let ownersMissingUser = 0;
        let ownersInvalidId = 0;
        for (const s of rawServers as any[]) {
            const legacyId = s.userId;
            if (legacyId != null && String(legacyId).length > 0 && s.ownerId == null) {
                const ok = mongoose.isValidObjectId(legacyId);
                if (!ok) {
                    ownersInvalidId += 1;
                    continue;
                }
                const owner = usersById.get(String(legacyId));
                if (!owner) {
                    ownersMissingUser += 1;
                    continue;
                }
                ownersConverted += 1;
                if (!isDryRun) {
                    await serversCol.updateOne(
                        { _id: s._id },
                        {
                            $set: {
                                ownerId: new mongoose.Types.ObjectId(String(legacyId)),
                                ownerEmail: owner.email || null,
                                ownerName: owner.name || null,
                            },
                            $unset: { userId: "" },
                        }
                    );
                }
            }
        }
        report(`2. ownership: ${ownersConverted} converted to ownerId; ${ownersMissingUser} referenced a deleted user; ${ownersInvalidId} had invalid ids (left as-is).`);

        // ── 3. emailLower backfill + duplicate-casing report ─────────────
        let emailBackfilled = 0;
        const byLower = new Map<string, number>();
        for (const u of usersById.values()) {
            if (!u.email) continue;
            const lower = String(u.email).trim().toLowerCase();
            byLower.set(lower, (byLower.get(lower) || 0) + 1);
        }
        const conflicts = [...byLower.entries()].filter(([, n]) => n > 1);
        for (const u of usersById.values()) {
            if (!u.email || u.emailLower) continue;
            const lower = String(u.email).trim().toLowerCase();
            if (conflicts.some(([k]) => k === lower)) continue; // leave for the admin report
            emailBackfilled += 1;
            if (!isDryRun) {
                await usersCol.updateOne({ _id: u._id }, { $set: { emailLower: lower } });
            }
        }
        report(
            `3. emails: ${emailBackfilled} emailLower backfilled; ${conflicts.length} conflict group(s) with mixed casing left untouched -> ${conflicts
                .map(([k]) => k)
                .join(", ")}`
        );

        // ── 4. providerType classification ───────────────────────────────
        let virtfusion = 0;
        let manual = 0;
        for (const s of rawServers as any[]) {
            if (s.providerType && s.providerType !== "virtfusion" && s.providerType !== "manual") continue;
            if (s.providerType === "virtfusion" || s.providerType === "manual") {
                if (s.providerType === "manual") manual += 1;
                else virtfusion += 1;
                continue;
            }
            const type = guessProviderType(s);
            if (type === "manual") manual += 1;
            else virtfusion += 1;
            if (!isDryRun) {
                await serversCol.updateOne({ _id: s._id }, { $set: { providerType: type } });
            }
        }
        report(`4. provider types: ${virtfusion} virtfusion, ${manual} classified manual (AWS-style / unlisted).`);

        // ── 5. initial ServerAssignment rows ─────────────────────────────
        const assignmentsCol = db.collection("serverassignments");
        const refreshedServers = await serversCol
            .find({ ownerId: { $ne: null }, providerType: { $exists: true } })
            .project({ ownerId: 1, name: 1 })
            .toArray();

        let assignmentsCreated = 0;
        for (const s of refreshedServers as any[]) {
            const existing = await assignmentsCol.findOne({ serverId: s._id, active: true });
            if (existing) continue;
            assignmentsCreated += 1;
            if (!isDryRun) {
                await assignmentsCol.insertOne({
                    serverId: s._id,
                    fromUserId: null,
                    toUserId: s.ownerId,
                    actorId: null,
                    reason: "Legacy ownership (migration 001)",
                    active: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
            }
        }
        report(`5. assignments: ${assignmentsCreated} initial ServerAssignment rows created for owned servers.`);

        // ── 6. TTL/legacy cleanup of suspended flags ─────────────────────
        const suspendedServers = await serversCol.countDocuments({ suspended: true, providerDeletedAt: null });
        report(`6. ${suspendedServers} servers are flagged suspended (unchanged).`);

        ctx.report("migration 001 done. Run the app once; indexes are verified on connect.");
    },
};

register(migration);
export default migration;