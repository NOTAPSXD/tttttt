import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, Invoice, Notification } from "@/lib/db";

// GET all invoices for a user (or all if admin)
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        await connectDB();
        const invoices = session.user.role === 'ADMIN'
            ? await Invoice.find().sort({ createdAt: -1 }).populate('userId')
            : await Invoice.find({ userId: session.user.id }).sort({ createdAt: -1 });

        return NextResponse.json(invoices);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
    }
}

// POST create new invoice (admin only)
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const body = await req.json();
        const { userId, amount, description, dueDate } = body;

        await connectDB();

        const invoice = await Invoice.create({
            userId,
            amount: parseFloat(amount),
            description,
            dueDate: new Date(dueDate),
            status: 'UNPAID'
        });

        // Create notification for user
        await Notification.create({
            userId,
            title: "New Invoice",
            message: `You have a new invoice for $${amount}. Due: ${new Date(dueDate).toLocaleDateString()}`,
            read: false
        });

        return NextResponse.json(invoice);
    } catch (error) {
        return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
    }
}
