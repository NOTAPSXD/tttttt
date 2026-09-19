import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, Server, User } from "@/lib/db";
import { getAdapterForServer, getCapabilities, ProviderError } from "@/lib/providers";
import { isAdmin } from "@/lib/permissions";
import { sendEmail } from "@/lib/email";
import { notifyUser, logAudit, providerErrorToResponse } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

const VALID_ACTIONS = ["boot", "shutdown", "powerOff", "restart"] as const;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const rl = await rateLimit(session.user.id, 5, 60000);
    if (!rl.success) {
        return NextResponse.json({ error: "Too many requests. Please wait before performing more actions." }, { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil(((rl.resetAt?.getTime() || 0) - Date.now()) / 1000))) } });
    }

    await connectDB();
    const { action } = await req.json().catch(() => ({}));

    if (!VALID_ACTIONS.includes(action)) {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const admin = isAdmin(String(session.user.role));
    const query = admin ? { _id: id } : { _id: id, ownerId: session.user.id };

    const server: any = await Server.findOne(query);
    if (!server) return new NextResponse("Not Found", { status: 404 });

    if (server.suspended && !admin) {
        return NextResponse.json({ error: "This server is suspended. Contact support to restore service." }, { status: 403 });
    }

    const caps = await getCapabilities(server.providerType).catch(() => null);
    if (caps && !caps.power) {
        return NextResponse.json({ error: "Power actions are not available for this infrastructure." }, { status: 400 });
    }

    const adapter = getAdapterForServer(server);
    try {
        const result = await adapter.power(server.providerServerId, action);

        if (result.success) {
            const user = server.ownerId ? await User.findById(server.ownerId).lean() : null;
            const actionMap: Record<string, string> = {
                boot: "Started",
                shutdown: "Shutdown",
                powerOff: "Forcibly Stopped",
                restart: "Rebooted",
            };
            const actionText = actionMap[action] || action;
            const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
            const actor = { id: session.user.id, role: String(session.user.role), email: session.user.email ?? undefined };

            await logAudit(actor, `SERVER_${action.toUpperCase()}`, { id: id, type: "server", name: server.name }, undefined, { action }, { ip });

            if (user?.email) {
                const emailHtml = `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
                    <h2 style="color: #0f172a; margin-bottom: 20px;">Server Activity Alert</h2>
                    <p style="color: #475569;">Hello <b>${user.name}</b>,<br/>An action was performed on your server <b>${server.name}</b>.</p>
                    <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <ul style="list-style: none; padding: 0; margin: 0; color: #334155;">
                            <li><strong>Action:</strong> ${actionText}</li>
                            <li><strong>Server:</strong> ${server.name}</li>
                            <li><strong>Initiated By:</strong> ${session.user.name} (${session.user.role})</li>
                            <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
                        </ul>
                    </div>
                </div>`;
                sendEmail(user.email, `Action Notification: ${server.name} was ${actionText}`, emailHtml).catch(() => {});
            }
            await notifyUser(String(server.ownerId || ""), "Server action", `"${server.name}" was ${actionText.toLowerCase()}.`).catch(() => {});

            return NextResponse.json(result.data ?? { success: true });
        }

        return NextResponse.json({ error: result.error?.message || "The provider rejected this action." }, { status: 500 });
    } catch (e) {
        const mapped = providerErrorToResponse(e);
        return NextResponse.json({ error: mapped.message, raw: mapped.raw }, { status: mapped.status });
    }
}