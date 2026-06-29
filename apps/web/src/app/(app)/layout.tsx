import { redirect } from "next/navigation";
import { CallOverlay } from "@/components/call/call-overlay";
import { IncomingCallListener } from "@/components/call/incoming-call-listener";
import { E2eeIdentityBootstrap } from "@/components/e2ee/e2ee-identity-bootstrap";
import { SessionGuard } from "@/components/session/session-guard";
import { CallShell } from "@/contexts/call-context";
import { isVoiceCallsEnabled } from "@/lib/call/feature-flag";
import { loadContactsForUser } from "@/lib/contacts/load-contacts.server";
import { getAuthUser } from "@/lib/supabase/get-user";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();

  if (!user) redirect("/login");

  const voiceCallsEnabled = isVoiceCallsEnabled();
  const contacts = voiceCallsEnabled ? await loadContactsForUser(user.id) : [];

  return (
    <SessionGuard>
      <CallShell currentUserId={user.id} contacts={contacts}>
        <E2eeIdentityBootstrap />
        {voiceCallsEnabled && <IncomingCallListener />}
        {children}
        {voiceCallsEnabled && <CallOverlay />}
      </CallShell>
    </SessionGuard>
  );
}