import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, Server, User } from "@/lib/db";
import { VPSServer } from "@/lib/models";
import { vf } from "@/lib/virtfusion";
import { sendEmail } from "@/lib/email";
import { startInstance, stopInstance, rebootInstance } from "@/lib/aws";

import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    // Rate Limit: 5 actions per minute per user
    const rl = rateLimit(session.user.id, 5, 60000);
    if (!rl.success) {
        return NextResponse.json({ error: "Too many requests. Please wait before performing more actions." }, { status: 429 });
    }

    await connectDB();
    const { action } = await req.json();

    // Validate action
    if (!['boot', 'shutdown', 'powerOff', 'restart'].includes(action)) {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Verify ownership or ADMIN role
    const query = session.user.role === 'ADMIN'
        ? { _id: id }
        : { _id: id, userId: session.user.id };

    let server: any = await Server.findOne(query);
    let isCloud = false;
    
    if (!server) {
        server = await VPSServer.findOne(query);
        isCloud = true;
    }

    if (!server) return new NextResponse("Not Found", { status: 404 });

    const user = await User.findById(server.userId);

    let result: any = { success: false, data: null, error: "" };

    try {
        if (isCloud) {
            const mappedAction = action === 'boot' ? 'start' : (action === 'shutdown' || action === 'powerOff') ? 'stop' : 'reboot';
            if (mappedAction === 'start') {
                await startInstance(server.region, server.instanceId);
            } else if (mappedAction === 'stop') {
                await stopInstance(server.region, server.instanceId);
            } else if (mappedAction === 'reboot') {
                await rebootInstance(server.region, server.instanceId);
            }
            result = { success: true, data: { status: 'requested' }, error: "" };
        } else {
            result = await vf.power(server.virtfusionId, action as any);
        }
    } catch (e: any) {
        result = { success: false, data: null, error: e.message };
    }

    if (result.success) {
        // Send Email Notification
        if (user?.email) {
            const actionMap: any = {
                boot: "Started",
                shutdown: "Shutdown",
                powerOff: "Forcibly Stopped",
                restart: "Rebooted"
            };
            const actionText = actionMap[action] || action;

            // Non-blocking email send
            sendEmail(
                user.email,
                `Action Notification: ${server.name} was ${actionText}`,
                `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
                    <h2 style="color: #0f172a; margin-bottom: 20px;">Server Activity Alert</h2>
                    <p style="color: #475569;">Hello <b>${user.name}</b>,</p>
                    <p style="color: #475569;">An action was performed on your server <b>${server.name}</b>.</p>
                    
                    <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
                        <ul style="list-style: none; padding: 0; margin: 0; color: #334155;">
                            <li style="margin-bottom: 8px;"><strong>Action:</strong> <span style="color: #2563eb;">${actionText}</span></li>
                            <li style="margin-bottom: 8px;"><strong>Server:</strong> ${server.name}</li>
                            <li style="margin-bottom: 8px;"><strong>Initiated By:</strong> ${session.user.name} (${session.user.role})</li>
                            <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
                        </ul>
                    </div>
                    
                    <p style="color: #64748b; font-size: 14px;">If you didn't initiate this action, please check your account security settings.</p>
                    
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;">
                    <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} VexaNode Control Panel</p>
                </div>
                `
            ).catch(err => console.error(err));
        }

        return NextResponse.json(result.data);
    } else {
        return NextResponse.json({ error: result.error }, { status: 500 });
    }
}
