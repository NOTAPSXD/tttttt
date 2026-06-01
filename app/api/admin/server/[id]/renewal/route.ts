import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB, Server } from '@/lib/db';

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { renewalDate } = await req.json();
        const { id } = await params;

        await connectDB();

        const server = await Server.findById(id);
        if (!server) {
            return NextResponse.json({ error: 'Server not found' }, { status: 404 });
        }

        server.renewalDate = renewalDate ? new Date(renewalDate) : undefined;
        await server.save();

        return NextResponse.json({
            success: true,
            renewalDate: server.renewalDate
        });
    } catch (error) {
        console.error('Error updating renewal date:', error);
        return NextResponse.json({ error: 'Failed to update renewal date' }, { status: 500 });
    }
}
