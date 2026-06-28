"use client";

import { usePathname } from "next/navigation";
import { MessagesShell } from "@/components/messages/messages-shell";
import { SettingsDialogHost } from "@/components/settings/settings-dialog-host";
import { CallOverlay } from "@/components/calls/call-overlay";
import { CallProvider } from "@/contexts/call-context";
import { ContactsProvider } from "@/contexts/contacts-context";
import type { Contact } from "@/lib/contacts/load-contacts";

export function MessagesShellLayout({
  contacts,
  currentUserId,
  displayName,
  publicId,
  avatarUrl,
  children,
}: {
  contacts: Contact[];
  currentUserId: string;
  displayName: string;
  publicId: string;
  avatarUrl: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const activeConversationId = pathname.startsWith("/chat/")
    ? pathname.split("/")[2] ?? null
    : null;

  return (
    <CallProvider currentUserId={currentUserId} contacts={contacts}>
      <ContactsProvider
        initialContacts={contacts}
        currentUserId={currentUserId}
        activeConversationId={activeConversationId}
      >
        <MessagesShell activeConversationId={activeConversationId}>
          {children}
        </MessagesShell>
        <CallOverlay />
        <SettingsDialogHost
          displayName={displayName}
          publicId={publicId}
          avatarUrl={avatarUrl}
        />
      </ContactsProvider>
    </CallProvider>
  );
}