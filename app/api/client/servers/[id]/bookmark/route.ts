import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { isValidObjectId } from "mongoose";
import { authOptions } from "@/lib/auth";
import { connectDB, Server } from "@/lib/db";
import { parseBody, bookmarkSchema } from "@/lib/validation";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!isValidObjectId(id)) {
            return NextResponse.json({ error: "Invalid server id" }, { status: 400 });
        }

        const parsed = await parseBody(req, bookmarkSchema);
        if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
        const bookmarked = parsed.data.bookmarked;

        await connectDB();

        // Only the owning client can bookmark their own server.
        const updated = await Server.findOneAndUpdate(
            { _id: id, ownerId: session.user.id },
            { bookmarked },
            { new: true }
        );

        if (!updated) {
            return NextResponse.json({ error: "Server not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, bookmarked: !!updated.bookmarked });
    } catch (e) {
        console.error("Bookmark error:", e);
        return NextResponse.json({ error: "Failed to update bookmark" }, { status: 500 });
    }
}