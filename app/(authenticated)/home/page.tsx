import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ClientHome from "@/app/(authenticated)/home/ClientHome";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  return <ClientHome />;
}