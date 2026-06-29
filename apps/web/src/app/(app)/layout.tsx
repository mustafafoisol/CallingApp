import { redirect } from "next/navigation";
import { CallOverlay } from "@/components/call/call-overlay";
import { IncomingCallListener } from "@/components/call/incoming-call-listener";
import { E2eeIdentityBootstrap } from "@/components/e2ee/e2ee-identity-bootstrap";
import { SessionGuard } from "@/components/session/session-guard";
import { CallProvider } from "@/contexts/call-context";
import { loadContactsForUser } from "@/lib/contacts/load-contacts";
import { getAuthUser } from "@/lib/supabase/get-user";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();

  if (!user) redirect("/login");

  const contacts = await loadContactsForUser(user.id);

  return (
    <SessionGuard>
      <CallProvider currentUserId={user.id} contacts={contacts}>
        <E2eeIdentityBootstrap />
        <IncomingCallListener />
        {children}
        <CallOverlay />
      </CallProvider>
    </SessionGuard>
  );
}