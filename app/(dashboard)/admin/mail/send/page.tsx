import { connectDB, User } from "@/lib/db";
import SendMailForm from "@/app/components/SendMailForm";

export default async function SendMailPage() {
    await connectDB();
    const usersData = await User.find({}, 'name email role status').sort({ name: 1 }).lean();

    // Map _id and serialize
    const users = usersData.map((u: any) => ({
        ...u,
        id: u._id.toString(),
        _id: u._id.toString(),
        role: u.role || 'CLIENT',
        status: u.status || 'active'
    }));

    return <SendMailForm users={users} />;
}
