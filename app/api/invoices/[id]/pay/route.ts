import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, Invoice, Notification, Log } from "@/lib/db";

// Mark invoice as paid
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        await connectDB();
        const body = await req.json();
        const { paymentMethod, reference } = body;

        const invoice = await Invoice.findById(id);

        if (!invoice) {
            return new NextResponse("Invoice not found", { status: 404 });
        }

        // Check authorization
        if (session.user.role !== 'ADMIN' && invoice.userId !== session.user.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const updated = await Invoice.findByIdAndUpdate(
            id,
            {
                status: 'PAID',
                paidAt: new Date(),
                paymentMethod,
                reference
            },
            { new: true }
        );

        // Create notification
        await Notification.create({
            userId: invoice.userId,
            title: "Payment Received",
            message: `Your payment of $${invoice.amount} has been received. Invoice #${id.slice(0, 8)}`,
            read: false
        });

        // Log the payment
        await Log.create({
            userId: session.user.id,
            action: 'PAYMENT_RECEIVED',
            details: `Invoice ${id} paid: $${invoice.amount} via ${paymentMethod}`
        });

        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json({ error: "Failed to process payment" }, { status: 500 });
    }
}
