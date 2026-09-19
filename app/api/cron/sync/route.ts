import { NextRequest, NextResponse } from "next/server";
import { runSync } from "@/lib/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Cron trigger for the provider sync. Protect against abuse the same way the
 * provider webhook protection works: an optional CRON_SECRET that, when set,
 * must match the Authorization: Bearer <secret> header.
 */
export async function POST(req: NextRequest) {
    const secret = process.env.CRON_SECRET;
    if (secret) {
        const auth = req.headers.get("authorization") || "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        if (token !== secret) return new NextResponse("Unauthorized", { status: 401 });
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