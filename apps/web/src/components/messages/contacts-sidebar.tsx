"use client";

import Link from "next/link";
import { Search, Settings } from "lucide-react";
import { ContactRow } from "@/components/contacts/contact-row";
import { SidebarChrome } from "@/components/messages/sidebar-chrome";
import { useContacts } from "@/contexts/contacts-context";

export function ContactsSidebar({
  activeConversationId,
}: {
  activeConversationId?: string | null;
}) {
  const contacts = useContacts();
  const addFriendHref = activeConversationId
    ? `/chat/${activeConversationId}?addFriend=1`
    : "/home?addFriend=1";
  const settingsHref = activeConversationId
    ? `/chat/${activeConversationId}?settings=1`
    : "/home?settings=1";

  return (
    <div className="flex h-full flex-col bg-[var(--chat-sidebar)]">
      <div className="px-5 pt-5 pb-3.5">
        <SidebarChrome />

        <div className="flex items-center gap-2 rounded-[11px] bg-[#F1E9E3] px-3.5 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-[#A8998F]" />
          <span className="text-sm text-[#A8998F]">Search conversations</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-3">
        {contacts.length === 0 ? (
          <div className="mx-1 rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-surface)] p-6 text-center text-sm text-[var(--chat-muted)]">
            <p>No contacts yet.</p>
            <Link
              href={addFriendHref}
              className="mt-2 inline-block font-medium text-[var(--chat-coral)]"
            >
              Add a friend by user ID
            </Link>
          </div>
        ) : (
          contacts.map((contact) => (
            <ContactRow
              key={contact.friendshipId}
              href={
                contact.conversationId
                  ? `/chat/${contact.conversationId}`
                  : addFriendHref
              }
              name={contact.friend.display_name ?? "Friend"}
              imageUrl={contact.friend.avatar_url}
              preview={contact.preview}
              lastMessageAt={contact.lastMessageAt}
              unreadCount={contact.unreadCount}
              active={contact.conversationId === activeConversationId}
            />
          ))
        )}
      </div>

      <div className="border-t border-[var(--chat-border)] px-3 py-2">
        <Link
          href={settingsHref}
          className="flex items-center gap-2.5 rounded-[13px] px-3 py-2.5 text-sm text-[var(--chat-muted)] transition-colors hover:bg-[var(--chat-hover)] hover:text-[var(--chat-text)]"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </div>
  );
}