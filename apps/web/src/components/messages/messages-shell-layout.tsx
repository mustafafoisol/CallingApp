"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MessagesShell } from "@/components/messages/messages-shell";
import { SettingsDialogHost } from "@/components/settings/settings-dialog-host";
import { ContactsProvider } from "@/contexts/contacts-context";
import { setNotificationNavigationHandler } from "@/lib/notifications/browser-message-notification";
import { primeMessageSound } from "@/lib/notifications/message-sound";
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
  const router = useRouter();
  const activeConversationId = pathname.startsWith("/chat/")
    ? pathname.split("/")[2] ?? null
    : null;

  useEffect(() => {
    setNotificationNavigationHandler((chatUrl) => {
      router.push(chatUrl);
    });

    return () => {
      setNotificationNavigationHandler(null);
    };
  }, [router]);

  useEffect(() => {
    function primeOnInteraction() {
      primeMessageSound();
      window.removeEventListener("pointerdown", primeOnInteraction);
      window.removeEventListener("keydown", primeOnInteraction);
    }

    window.addEventListener("pointerdown", primeOnInteraction);
    window.addEventListener("keydown", primeOnInteraction);

    return () => {
      window.removeEventListener("pointerdown", primeOnInteraction);
      window.removeEventListener("keydown", primeOnInteraction);
    };
  }, []);

  return (
    <ContactsProvider
      initialContacts={contacts}
      currentUserId={currentUserId}
      activeConversationId={activeConversationId}
    >
      <MessagesShell activeConversationId={activeConversationId}>
        {children}
      </MessagesShell>
      <SettingsDialogHost
        displayName={displayName}
        publicId={publicId}
        avatarUrl={avatarUrl}
      />
    </ContactsProvider>
  );
}