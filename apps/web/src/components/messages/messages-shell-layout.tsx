"use client";

import { usePathname } from "next/navigation";
import { MessagesShell } from "@/components/messages/messages-shell";
import type { Contact } from "@/lib/contacts/load-contacts";

export function MessagesShellLayout({
  contacts,
  children,
}: {
  contacts: Contact[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const activeConversationId = pathname.startsWith("/chat/")
    ? pathname.split("/")[2] ?? null
    : null;

  return (
    <MessagesShell contacts={contacts} activeConversationId={activeConversationId}>
      {children}
    </MessagesShell>
  );
}