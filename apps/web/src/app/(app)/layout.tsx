import { redirect } from "next/navigation";
import { SessionGuard } from "@/components/session/session-guard";
import { getAuthUser } from "@/lib/supabase/get-user";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();

  if (!user) redirect("/login");

  return <SessionGuard>{children}</SessionGuard>;
}