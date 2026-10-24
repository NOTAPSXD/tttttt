import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, Server, User } from "@/lib/db";
import { getAdapterForServer, getCapabilities } from "@/lib/providers";
import { isAdmin } from "@/lib/permissions";
import { sendEmail } from "@/lib/email";
import { notifyUser, logAudit, providerErrorToResponse } from "@/lib/audit";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    await connectDB();

    const admin = isAdmin(String(session.user.role));
    const query = admin ? { _id: id } : { _id: id, ownerId: session.user.id };

    const server: any = await Server.findOne(query);
    if (!server) return new NextResponse("Not Found", { status: 404 });

    if (server.suspended && !admin) {
        return NextResponse.json({ error: "This server is suspended. Contact support to restore service." }, { status: 403 });
    }

    const caps = await getCapabilities(server.providerType).catch(() => null);
    if (caps && !caps.resetPassword) {
        return NextResponse.json({ error: "Password resets are not available for this infrastructure." }, { status: 400 });
    }

    try {
        const adapter = getAdapterForServer(server);
        const data = await adapter.resetPassword(server.providerServerId, { user: "root" });
        const newPassword = data.expectedPassword;

        const user = server.ownerId ? await User.findById(server.ownerId).lean() : null;
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
        const actor = { id: session.user.id, role: String(session.user.role), email: session.user.email ?? undefined };

        await logAudit(actor, "SERVER_PASSWORD_RESET", { id, type: "server", name: server.name }, undefined, { user: "root" }, { ip });

        if (user?.email && newPassword) {
            sendEmail(
                user.email,
                `Password Reset: ${server.name}`,
                `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
                    <h2 style="color: #0f172a;">Password Reset Successful</h2>
                    <p style="color: #475569;">Hello <b>${user.name}</b>, the root password for your server <b>${server.name}</b> has been reset.</p>
                    <div style="background: #eff6ff; padding: 20px; border-radius: 8px; border: 1px solid #dbeafe; text-align: center;">
                        <p style="margin: 0 0 10px 0; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; color: #1e40af; font-weight: bold;">New Root Password</p>
                        <code style="font-size: 24px; font-weight: bold; color: #1e3a8a; background: #fff; padding: 10px 20px; border-radius: 6px; border: 1px solid #bfdbfe; display: inline-block;">${newPassword}</code>
                    </div>
                    <p style="color: #ef4444; font-size: 13px;"><strong>Security Warning:</strong> Please login and change this password immediately. Do not share this email.</p>
                </div>
                `
            ).catch(() => {});
        }
        await notifyUser(
            String(server.ownerId || ""),
            "Password reset",
            `The root password for "${server.name}" was reset. Check your email for the new credentials.`,
            { type: "warning" }
        ).catch(() => {});

        return NextResponse.json(data);
    } catch (e) {
        const mapped = providerErrorToResponse(e);
        return NextResponse.json({ error: mapped.message, raw: mapped.raw }, { status: mapped.status });
    }
}