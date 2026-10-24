import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, Server, User } from "@/lib/db";
import { assignServer } from "@/lib/ownership";
import { getAdapter } from "@/lib/providers";
import { isAdmin } from "@/lib/permissions";
import { sendEmail } from "@/lib/email";
import { parseBody, assignSchema } from "@/lib/validation";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !isAdmin(String(session.user.role))) return new NextResponse("Unauthorized", { status: 403 });

    try {
        await connectDB();
        const parsed = await parseBody(req, assignSchema);
        if (!parsed.ok) return new NextResponse(parsed.error, { status: 400 });
        const { providerServerId, virtfusionId, userId, reason, notify } = parsed.data;

        const resolvedId = String(providerServerId || virtfusionId || "");
        if (!resolvedId) return new NextResponse("Missing server id", { status: 400 });

        // Look up the server record first; if it isn't mapped yet, create it
        // from the provider catalog so assignments work for brand-new assets.
        let server = await Server.findOne({ providerServerId: resolvedId });
        if (!server) {
            const adapter = getAdapter("virtfusion");
            const upstream = await adapter.getUpstream(resolvedId);
            if (!upstream) return new NextResponse("Server not found on the provider", { status: 404 });

            const name = upstream.name || "Unknown Server";
            const ip = upstream.network?.primary?.ipv4?.[0]?.address || upstream.network?.primary?.ipv4?.[0] || "";
            server = await Server.create({
                providerServerId: resolvedId,
                providerType: "virtfusion",
                name: String(name),
                ip,
                ipLower: ip ? String(ip).toLowerCase() : undefined,
                status: upstream.state?.running === true ? "RUNNING" : "UNKNOWN",
                ownerId: null,
            });
        }

        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
        const result = await assignServer({
            serverId: String(server._id),
            toUserId: userId,
            actor: { id: session.user.id, role: String(session.user.role), email: session.user.email ?? undefined },
            reason,
            ip,
        });

        if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        if (notify) {
            try {
                const assignedUser = await User.findById(userId).select("name email").lean();
                if (assignedUser?.email) {
                    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:2004";
                    const emailHtml = `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 550px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                        <div style="background: linear-gradient(135deg, #09090b 0%, #18181b 100%); padding: 28px 36px; border-bottom: 2px solid #2563eb;">
                            <span style="font-size: 18px; font-weight: 800; color: #ffffff;">VEXA<span style="color: #3b82f6;">NODE</span></span>
                        </div>
                        <div style="padding: 32px 36px; color: #1e293b;">
                            <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #0f172a;">Server Assigned 🚀</h2>
                            <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
                                Hello <strong>${assignedUser.name || "User"}</strong>, a VPS instance has been provisioned and assigned to your account.
                            </p>
                            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 6px; margin: 20px 0;">
                                <tr>
                                    <td style="padding: 14px 18px;">
                                        <p style="margin: 0; font-size: 13px; color: #0f172a;"><strong>Server Name:</strong> ${server.name}</p>
                                        ${server.ip ? `<p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;"><strong>Primary IP:</strong> ${server.ip}</p>` : ""}
                                    </td>
                                </tr>
                            </table>
                            <div style="text-align: center; margin: 28px 0 16px 0;">
                                <a href="${baseUrl}/client" style="background: #2563eb; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px; display: inline-block;">
                                    Manage Server in Dashboard &rarr;
                                </a>
                            </div>
                        </div>
                        <div style="background-color: #f8fafc; padding: 18px 36px; border-top: 1px solid #e2e8f0; text-align: center;">
                            <p style="margin: 0; font-size: 12px; color: #94a3b8;">&copy; VexaNode Cloud Platform</p>
                        </div>
                    </div>`;
                    await sendEmail(assignedUser.email, `Server Assigned: ${server.name}`, emailHtml, session.user.id);
                }
            } catch (err) {
                console.warn("[assign] failed to send email notification:", err);
            }
        }

        return NextResponse.json({
            success: true,
            status: result.status,
            server: {
                id: result.serverId,
                ownerId: result.ownerId,
            },
        });
    } catch (e) {
        console.error("assign error:", e);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}