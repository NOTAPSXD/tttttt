import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB, User } from "@/lib/db";
import { redirect } from "next/navigation";
import CreateInvoiceForm from "@/app/components/CreateInvoiceForm";

export default async function CreateInvoicePage() {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
        redirect('/invoices');
    }

    await connectDB();
    const usersData = await User.find({}, 'name email role').sort({ name: 1 }).lean();

    // Map _id to id and serialize
    const users = usersData.map((u: any) => ({
        ...u,
        id: u._id.toString(),
        _id: u._id.toString()
    }));

    return <CreateInvoiceForm users={users} />;
}
