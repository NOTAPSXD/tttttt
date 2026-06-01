import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) {
    if (session.user.role === 'ADMIN') redirect("/admin");
    else redirect("/client");
  } else {
    redirect("/login");
  }
}
