import { connectDB, User, Server } from "@/lib/db";
import UserManagement from "@/app/components/UserManagement";

export default async function AdminUsersPage() {
    await connectDB();
    const usersData = await User.find().sort({ createdAt: -1 }).lean();

    // Aggregation to count provider servers per user (ownerId post-migration,
    // userId for any legacy records not yet migrated).
    const serverCounts = await Server.aggregate([
        { $group: { _id: { $ifNull: ["$ownerId", "$userId"] }, count: { $sum: 1 } } }
    ]);

    const countMap = new Map();
    serverCounts.forEach((s: any) => {
        if (s._id) countMap.set(s._id.toString(), s.count);
    });

    const users = usersData.map((u: any) => ({
        ...u,
        id: u._id.toString(),
        _id: u._id.toString(),
        _count: {
            servers: countMap.get(u._id.toString()) || 0
        }
    }));

    const formattedUsers = users.map((user: any) => ({
        ...user,
        role: user.role as "ADMIN" | "CLIENT",
        createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
        updatedAt: user.updatedAt instanceof Date ? user.updatedAt.toISOString() : user.updatedAt,
    }));

    // Serialize to remove any lingering Mongoose objects
    const serializedUsers = JSON.parse(JSON.stringify(formattedUsers));

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <h1 className="text-3xl font-bold text-white">User Management</h1>
            <UserManagement users={serializedUsers} />
        </div>
    )
}
