import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, User, Server } from "@/lib/db";
import { isAdmin } from "@/lib/permissions";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !isAdmin(String(session.user.role))) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { id } = await params;

        if (session.user.id === id) {
            return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
        }

        const user = await User.findById(id);
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const serverCount = await Server.countDocuments({ ownerId: id });
        if (serverCount > 0) {
            return NextResponse.json(
                { error: `Cannot delete user with ${serverCount} assigned server(s). Please reassign or remove servers first.` },
                { status: 400 }
            );
        }

        await User.findByIdAndDelete(id);

        return NextResponse.json({
            message: "User deleted successfully",
            deletedUser: { id: user._id, name: user.name, email: user.email },
        });
    } catch (error) {
        console.error("Delete user error:", error);
        return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
    }
}

const VALID_ROLES = ["CLIENT", "SUPPORT", "ADMIN", "SUPER_ADMIN"];

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !isAdmin(String(session.user.role))) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { id } = await params;
        const body = await request.json().catch(() => ({}));
        const { name, email, role } = body;

        if (!name || !email) {
            return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
        }

        const normalizedEmail = String(email).trim().toLowerCase();

        const existingUser = await User.findOne({
            $or: [{ email: normalizedEmail }, { emailLower: normalizedEmail.toLowerCase() }],
            _id: { $ne: id },
        });
        if (existingUser) return NextResponse.json({ error: "Email already in use" }, { status: 400 });

        const patch: any = { name, email: normalizedEmail, emailLower: normalizedEmail };
        if (role) {
            const chosenRole = String(role).toUpperCase();
            if (!VALID_ROLES.includes(chosenRole)) {
                return NextResponse.json({ error: "Invalid role" }, { status: 400 });
            }
            if (chosenRole === "SUPER_ADMIN" && String(session.user.role) !== "SUPER_ADMIN") {
                return NextResponse.json({ error: "Insufficient permissions to assign this role" }, { status: 403 });
            }
            patch.role = chosenRole;
        }

        const updatedUser = await User.findByIdAndUpdate(id, patch, { new: true });
        if (!updatedUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

        return NextResponse.json({
            message: "User updated successfully",
            user: { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email, role: updatedUser.role },
        });
    } catch (error) {
        console.error("Update user error:", error);
        return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }
}