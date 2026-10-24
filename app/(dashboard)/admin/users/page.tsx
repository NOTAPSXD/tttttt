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

    const countMap = new Map<string, number>();
    serverCounts.forEach((s: any) => {
        if (s._id) countMap.set(s._id.toString(), s.count);
    });

    const formattedUsers = usersData.map((u: any) => {
        const id = u._id.toString();
        const serverCount = countMap.get(id) || 0;
        return {
            id,
            _id: id,
            name: u.name || "",
            email: u.email || "",
            role: (u.role || "CLIENT") as "CLIENT" | "SUPPORT" | "ADMIN" | "SUPER_ADMIN",
            status: (u.status || (u.suspended ? "suspended" : "active")) as "active" | "suspended",
            suspended: Boolean(u.suspended),
            verified: Boolean(u.verified),
            balance: Number(u.balance || 0),
            discordId: u.discordId || null,
            lastLogin: u.lastLogin instanceof Date ? u.lastLogin.toISOString() : (u.lastLogin || null),
            lastLoginIp: u.lastLoginIp || null,
            createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : (u.createdAt || null),
            updatedAt: u.updatedAt instanceof Date ? u.updatedAt.toISOString() : (u.updatedAt || null),
            twoFactorEnabled: Boolean(u.twoFactor?.enabled),
            serversCount: serverCount,
            _count: {
                servers: serverCount,
            },
        };
    });

    // Serialize to remove any lingering Mongoose-specific objects
    const serializedUsers = JSON.parse(JSON.stringify(formattedUsers));

    return <UserManagement users={serializedUsers} />;
}

