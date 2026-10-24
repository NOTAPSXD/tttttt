import mongoose from "mongoose";

type MigrationModule = typeof import("@/lib/migrations");
type MigrationContext = import("@/lib/migrations").MigrationContext;

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("[migrate] MONGODB_URI is not set.");
        process.exit(1);
    }

    // Lazy-load migrations after the URI guard, because the provider layer
    // connects to Mongo at import time.
    const { getMigrations } = (await import("@/lib/migrations")) as MigrationModule;
    await import("@/lib/migrations/001-initial");

    const target = process.argv[2]; // optional: only run up to this id
    const dryRun = process.argv.includes("--dry");

    await mongoose.connect(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 15000,
    });

    const db = mongoose.connection.db;
    if (!db) {
        console.error("[migrate] failed to obtain db handle");
        await mongoose.disconnect();
        process.exit(1);
    }

    const recordCol = db.collection("migrations");
    const applied = await recordCol.find({}).sort({ id: 1 }).toArray();
    const appliedIds = new Set(applied.map((r: any) => r.id));

    const migrations = getMigrations()
        .filter((m) => !appliedIds.has(m.id))
        .filter((m) => !target || m.id <= target);

    if (migrations.length === 0) {
        console.log("[migrate] no pending migrations.");
        await mongoose.disconnect();
        return;
    }

    const reports: string[] = [];
    const report = (msg: string) => {
        console.log("   •", msg);
        reports.push(msg);
    };

    for (const m of migrations) {
        console.log(`[migrate] running ${m.id} ${m.name}${dryRun ? " (DRY RUN — no changes written)" : ""}`);
        const ctx: MigrationContext = { db, report, isDryRun: dryRun };
        try {
            await m.up(ctx);
            if (!dryRun) {
                await recordCol.insertOne({
                    id: m.id,
                    name: m.name,
                    appliedAt: new Date(),
                    dryRun: false,
                });
                console.log(`[migrate] ✔ applied ${m.id}`);
            } else {
                console.log(`[migrate] ~ would apply ${m.id} (dry run)`);
            }
        } catch (e) {
            console.error(`[migrate] ✘ ${m.id} failed:`, e);
            await mongoose.disconnect();
            process.exit(1);
        }
    }

    await mongoose.disconnect();
    console.log("[migrate] done.");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});