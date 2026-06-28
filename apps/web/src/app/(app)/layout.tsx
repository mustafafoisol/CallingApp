import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/get-user";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();

  if (!user) redirect("/login");

  return <>{children}</>;
}