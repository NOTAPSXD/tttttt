import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";
import { requireSuperAdmin } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { User, Server, ServerAssignment, Notification, Log, EmailLog, Session, LoginHistory, AuditLog, Task, Announcement, ServerShare, TrafficBucket, RateLimit, SyncRun, Migration } from "@/lib/db";

const TIMEOUT_SECONDS = 15

const ObjectId = mongoose.Types.ObjectId;

// Turn any value into a printable string, handling ObjectIds, Dates, bigints
// and circular structures so scripts can log mongoose docs verbatim.
function stringifyValue(v: unknown): string {
    const seen = new WeakSet<object>();
    const rev = (_k: string, val: any): any => {
        if (typeof val === "bigint") return String(val) + "n";
        if (typeof val === "function") return String(val);
        if (typeof val === "symbol") return String(val);
        if (val instanceof Date) return val.toISOString();
        if ((val as any)?._bsontype === "ObjectID") return String(val);
        if (val && typeof val === "object") {
            if (seen.has(val)) return "[Circular]";
            seen.add(val);
            if (Array.isArray(val) || val.constructor === Object) return val;
            return "[Instance:" + (val.constructor?.name || "Object") + "]";
        }
        return val;
    };
    try {
        return JSON.stringify(v, rev);
    } catch {
        return String(v);
    }
}

interface RunResult {
    ok: boolean;
    printed: string[];
    durationMs: number;
    timeout: boolean;
    result?: unknown;
    error?: string;
}

async function run(code: string): Promise<RunResult> {
    const started = Date.now();
    const printed: string[] = [];
    const push = (...args: unknown[]) => printed.push(args.map(stringifyValue).join(" "));

    const log = console.log;
    const err = console.error;
    console.log = push as any;
    console.error = push as any;

    let timer: NodeJS.Timeout | null = null;
    let finished = false;
    let timedOut = false;

    try {
        const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as any;
        const fn = new AsyncFunction(
            "connectDB",
            "mongoose",
            "User",
            "Server",
            "ServerAssignment",
            "Notification",
            "Log",
            "EmailLog",
            "Session",
            "LoginHistory",
            "AuditLog",
            "Task",
            "Announcement",
            "ServerShare",
            "TrafficBucket",
            "RateLimit",
            "SyncRun",
            "Migration",
            `return (async () => {\n${code}\n})();`
        );

        const trace = fn(connectDB, mongoose, ObjectId);
        const timeout = new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
                if (!finished) {
                    finished = true;
                            timedOut = true;
                    reject(new Error("Script exceeded the timeout and was aborted."));
                }
            }, TIMEOUT_SECONDS * 1000);
        });

        const result = await Promise.race([trace, timeout]);
        if (timer) clearTimeout(timer);
        return { ok: true, printed, result, durationMs: Date.now() - started, timeout: false };
    } catch (e: any) {
        return {
            ok: false,
            printed,
            durationMs: Date.now() - started,
            timeout: timedOut,
            error: e?.message || String(e),
        };
    } finally {
        console.log = log;
        console.error = err;
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !requireSuperAdmin(String(session.user.role))) {
        return NextResponse.json({ error: "SUPER_ADMIN only" }, { status: 403 });
    }

    let body: any = {};
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const code = typeof body?.code === "string" ? body.code : "";
    if (!code.trim()) return NextResponse.json({ error: "Code is required" }, { status: 400 });
    if (code.length > 30_000) return NextResponse.json({ error: "Code too long" }, { status: 400 });

    await connectDB().catch(() => {});

    const rl = await rateLimit(`console_${String(session.user.id)}`, 8, 60_000);
    if (!rl.success) return NextResponse.json({ error: "Rate limited, wait a minute." }, { status: 429 });

    const out = await run(code);

    const actor = {
        id: String(session.user.id),
        role: String(session.user.role),
        email: session.user.email ?? undefined,
    };
    await logAudit(
        actor,
        "ADMIN_CONSOLE_RUN",
        undefined,
        undefined,
        {
            codePreview: code.slice(0, 2000),
            ok: out.ok,
            timeout: out.timeout,
            durationMs: out.durationMs,
            printedPreview: out.printed.slice(0, 8).join("\n").slice(0, 2000),
            resultPreview: stringifyValue(out.result).slice(0, 2000),
            error: out.error,
        },
        { ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined }
    ).catch(() => {});

    return NextResponse.json({
        ok: out.ok,
        printed: out.printed.slice(0, 200),
        result: out.ok ? stringifyValue(out.result) : null,
        error: out.error,
        timeout: out.timeout,
        durationMs: out.durationMs,
    });
}
