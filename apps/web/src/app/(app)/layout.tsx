import { redirect } from "next/navigation";
import { E2eeIdentityBootstrap } from "@/components/e2ee/e2ee-identity-bootstrap";
import { SessionGuard } from "@/components/session/session-guard";
import { getAuthUser } from "@/lib/supabase/get-user";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();

  if (!user) redirect("/login");

  return (
    <SessionGuard>
      <E2eeIdentityBootstrap />
      {children}
    </SessionGuard>
  );
}