import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { connectDB, User } from "@/lib/db";
import { isAdmin } from "@/lib/permissions";
import { parseBody, sendMailSchema } from "@/lib/validation";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !isAdmin(String(session.user.role))) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const parsed = await parseBody(req, sendMailSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { recipient, subject, content, userId } = parsed.data;

    let finalRecipient = recipient;
    if (userId) {
        await connectDB();
        const user = await User.findById(userId);
        if (user) finalRecipient = user?.email || recipient;
    }

    if (!finalRecipient) return new NextResponse("Recipient required", { status: 400 });

    const success = await sendEmail(finalRecipient, subject, content, session.user.id);

    if (success) return NextResponse.json({ success: true });
    return NextResponse.json({ error: "Failed to send email. Check logs." }, { status: 500 });
}
