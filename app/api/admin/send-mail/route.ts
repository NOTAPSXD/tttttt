import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { connectDB, User } from "@/lib/db";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { recipient, subject, content, userId } = await req.json();

    let finalRecipient = recipient;
    if (userId) {
        await connectDB();
        const user = await User.findById(userId);
        if (user) finalRecipient = user.email;
    }

    if (!finalRecipient) return new NextResponse("Recipient required", { status: 400 });

    const success = await sendEmail(finalRecipient, subject, content, session.user.id);

    if (success) return NextResponse.json({ success: true });
    return NextResponse.json({ error: "Failed to send email. Check logs." }, { status: 500 });
}
