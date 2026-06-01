import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, Server, User, VPSServer, IServer, IVPSServer } from "@/lib/db";
import { vf } from "@/lib/virtfusion";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    await connectDB();

    const query = session.user.role === 'ADMIN'
        ? { _id: id }
        : { _id: id, userId: session.user.id };

    let server: IServer | IVPSServer | null = await Server.findOne(query);
    let isCloud = false;

    if (!server) {
        server = await VPSServer.findOne(query);
        isCloud = true;
    }

    if (!server) return new NextResponse("Not Found", { status: 404 });

    if (isCloud) {
        return NextResponse.json(
            { error: "Password reset is not supported for Cloud instances. Please use your AWS SSH Key." },
            { status: 400 }
        );
    }

    const user = await User.findById(server.userId);

    try {
        const data = await vf.resetPassword((server as IServer).virtfusionId);
        const newPassword = data.expectedPassword;

        // Send Email Notification with Password
        if (user?.email && newPassword) {
            sendEmail(
                user.email,
                `Password Reset: ${server.name}`,
                `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
                    <h2 style="color: #0f172a;">Password Reset Successful</h2>
                    <p style="color: #475569;">Hello <b>${user.name}</b>,</p>
                    <p style="color: #475569;">The root password for your server <b>${server.name}</b> has been reset.</p>
                    
                    <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #dbeafe; text-align: center;">
                        <p style="margin: 0 0 10px 0; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; color: #1e40af; font-weight: bold;">New Root Password</p>
                        <code style="font-size: 24px; font-weight: bold; color: #1e3a8a; background: #fff; padding: 10px 20px; border-radius: 6px; border: 1px solid #bfdbfe; display: inline-block;">${newPassword}</code>
                    </div>
                    
                    <p style="color: #ef4444; font-size: 13px;"><strong>Security Warning:</strong> Please login and change this password immediately. Do not share this email.</p>
                    
                    <p style="color: #64748b; font-size: 12px; margin-top: 20px;">Requested by: ${session.user.email} from IP: ${req.headers.get('x-forwarded-for') || 'Unknown'}</p>
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;">
                    <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} VexaNode Control Panel</p>
                </div>
                `
            ).catch(err => console.error(err));
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : "Failed to reset password";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
