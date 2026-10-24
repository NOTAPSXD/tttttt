import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) {
    if (isAdmin(session.user.role)) redirect("/admin");
    else redirect("/client");
  } else {
    redirect("/login");
  }
}
