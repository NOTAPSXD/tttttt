import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendEmail, renderEmailTemplate } from "@/lib/email";
import { connectDB, User } from "@/lib/db";
import { isAdmin } from "@/lib/permissions";
import { parseBody, sendMailSchema } from "@/lib/validation";

interface RecipientTarget {
    email: string;
    name: string;
    role?: string;
    userId?: string;
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !isAdmin(String(session.user.role))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = await parseBody(req, sendMailSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const {
        recipient,
        recipients,
        userId,
        userIds,
        sendToAll,
        targetRole,
        subject,
        content,
    } = parsed.data;

    await connectDB();

    const targets: RecipientTarget[] = [];
    const seenEmails = new Set<string>();

    const addTarget = (t: RecipientTarget) => {
        const normalized = t.email?.trim().toLowerCase();
        if (normalized && normalized.includes("@") && !seenEmails.has(normalized)) {
            seenEmails.add(normalized);
            targets.push({
                ...t,
                email: normalized,
                name: t.name?.trim() || normalized.split("@")[0],
            });
        }
    };

    // 1. Broadcast to all users (optional role filter)
    if (sendToAll) {
        const query: Record<string, any> = {
            status: { $ne: "suspended" },
        };
        if (targetRole && targetRole !== "ALL") {
            query.role = targetRole;
        }
        const dbUsers = await User.find(query, "name email role").lean();
        for (const u of dbUsers) {
            if (u.email) {
                addTarget({
                    email: u.email,
                    name: u.name,
                    role: u.role,
                    userId: String(u._id),
                });
            }
        }
    }
    // 2. Specific multiple user IDs
    else if (userIds && userIds.length > 0) {
        const dbUsers = await User.find({ _id: { $in: userIds } }, "name email role").lean();
        for (const u of dbUsers) {
            if (u.email) {
                addTarget({
                    email: u.email,
                    name: u.name,
                    role: u.role,
                    userId: String(u._id),
                });
            }
        }
    }
    // 3. Single legacy user ID
    else if (userId) {
        const dbUser = await User.findById(userId, "name email role").lean();
        if (dbUser?.email) {
            addTarget({
                email: dbUser.email,
                name: dbUser.name,
                role: dbUser.role,
                userId: String(dbUser._id),
            });
        }
    }

    // 4. Multiple explicit recipient emails
    if (recipients && recipients.length > 0) {
        for (const raw of recipients) {
            if (typeof raw === "string") {
                const parts = raw.split(/[,;\n\r]+/).map((s) => s.trim()).filter(Boolean);
                for (const part of parts) {
                    addTarget({ email: part, name: part.split("@")[0], role: "External" });
                }
            }
        }
    }

    // 5. Single/comma-separated recipient email string
    if (recipient) {
        const parts = recipient.split(/[,;\n\r]+/).map((s) => s.trim()).filter(Boolean);
        for (const part of parts) {
            addTarget({ email: part, name: part.split("@")[0], role: "External" });
        }
    }

    if (targets.length === 0) {
        return NextResponse.json({ error: "No valid recipient email addresses found." }, { status: 400 });
    }

    let successCount = 0;
    let failCount = 0;
    const errors: Array<{ email: string; error: string }> = [];

    // Send emails sequentially or in controlled parallel batches
    for (const t of targets) {
        const personalizedSubject = renderEmailTemplate(subject, t);
        const personalizedContent = renderEmailTemplate(content, t);

        try {
            const ok = await sendEmail(
                t.email,
                personalizedSubject,
                personalizedContent,
                session.user.id
            );
            if (ok) {
                successCount++;
            } else {
                failCount++;
                errors.push({ email: t.email, error: "SMTP dispatch failed" });
            }
        } catch (err: any) {
            failCount++;
            errors.push({ email: t.email, error: err?.message || "Unknown error" });
        }
    }

    if (successCount === 0) {
        return NextResponse.json(
            {
                error: "Failed to dispatch emails. Please verify your SMTP settings.",
                details: errors,
                failedCount: failCount,
                total: targets.length,
            },
            { status: 500 }
        );
    }

    return NextResponse.json({
        success: true,
        sentCount: successCount,
        failedCount: failCount,
        total: targets.length,
        message: `Dispatched to ${successCount} recipient${successCount === 1 ? "" : "s"}${
            failCount > 0 ? ` (${failCount} failed)` : ""
        }.`,
    });
}
