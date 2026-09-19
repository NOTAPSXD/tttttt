import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSyncCounts, listSyncRuns, runSync } from "@/lib/sync";

export const dynamic = "force-dynamic";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") return new NextResponse("Unauthorized", { status: 403 });

    try {
        const [counts, runs] = await Promise.all([getSyncCounts(), listSyncRuns()]);
        return NextResponse.json({
            counts,
            runs: runs.map((r) => ({
                id: String(r._id),
                startedAt: r.startedAt,
                finishedAt: r.finishedAt,
                status: r.status,
                added: r.added,
                updated: r.updated,
                missing: r.missing,
                unassigned: r.unassigned,
                orphaned: r.orphaned,
                errorsList: r.errorsList ?? [],
                totals: r.totals,
            })),
        });
    } catch (e) {
        console.error("sync GET failed:", e);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") return new NextResponse("Unauthorized", { status: 403 });

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun === true;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;

    const outcome = await runSync({
        actor: { id: session.user.id, role: String(session.user.role), email: session.user.email ?? "" },
        ip,
        dryRun,
    });

    if (!outcome.ok) {
        return NextResponse.json({ error: outcome.error }, { status: outcome.status });
    }

    return NextResponse.json({
        success: true,
        dryRun: outcome.dryRun ?? false,
        results: outcome.results,
        runId: outcome.runId,
    });
}