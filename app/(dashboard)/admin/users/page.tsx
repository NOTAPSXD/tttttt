import { connectDB, User, Server } from "@/lib/db";
import UserManagement from "@/app/components/UserManagement";

export default async function AdminUsersPage() {
    await connectDB();
    const usersData = await User.find().sort({ createdAt: -1 }).lean();

    // Aggregation to count servers per user
    const serverCounts = await Server.aggregate([
        { $group: { _id: "$userId", count: { $sum: 1 } } }
    ]);
    const countMap = new Map(serverCounts.map((s: any) => [s._id.toString(), s.count]));

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
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
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
