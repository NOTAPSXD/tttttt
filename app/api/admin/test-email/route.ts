import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { email } = await req.json();
    if (!email) return new NextResponse("Email required", { status: 400 });

    const success = await sendEmail(
        email,
        "VexaNode SMTP Test",
        `
        <div style="font-family: sans-serif; padding: 20px; background: #0f1419; color: #fff; border-radius: 10px;">
            <h1 style="color: #3b82f6;">SMTP Test Successful</h1>
            <p>This is a test email from your VexaNode Control Panel.</p>
            <p>If you received this, your email configuration is working correctly.</p>
            <hr style="border: 1px solid #333;">
            <p style="font-size: 12px; color: #888;">Sent from VexaNode Panel</p>
        </div>
        `
    );

    if (success) {
        return NextResponse.json({ message: "Test email sent successfully" });
    } else {
        return NextResponse.json({ error: "Failed to send email. Check server logs." }, { status: 500 });
    }
}
