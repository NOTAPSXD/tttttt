import { NextRequest, NextResponse } from "next/server";
import { runSync } from "@/lib/sync";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Cron trigger for the provider sync.
 * F-001: Fail-closed when CRON_SECRET is not configured (503).
 * Uses constant-time comparison when configured to prevent timing side-channels.
 */
export async function POST(req: NextRequest) {
    const secret = process.env.CRON_SECRET;
    if (!secret || secret.trim() === "" || secret === "change-me") {
        return new NextResponse("Service Unavailable: CRON_SECRET is not configured", { status: 503 });
    }

    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

    const secretBuf = Buffer.from(secret);
    const tokenBuf = Buffer.from(token);

    if (secretBuf.length !== tokenBuf.length || !crypto.timingSafeEqual(secretBuf, tokenBuf)) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const outcome = await runSync({});

    if (!outcome.ok) {
        return NextResponse.json({ success: false, error: outcome.error }, { status: outcome.status });
    }

    return NextResponse.json({
        success: true,
        results: outcome.results,
        runId: outcome.runId,
    });
}
