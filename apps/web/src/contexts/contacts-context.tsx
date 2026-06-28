"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
  IMAGE_MESSAGE_PREVIEW,
  REMOVED_MESSAGE_LABEL,
  type MessageRow,
} from "@/lib/chat/messages";
import { markConversationRead } from "@/lib/contacts/mark-conversation-read";
import type { Contact } from "@/lib/contacts/load-contacts";

const ContactsContext = createContext<Contact[]>([]);

function messagePreview(message: MessageRow): string {
  if (message.removed_at) return REMOVED_MESSAGE_LABEL;
  if (message.type === "image") return IMAGE_MESSAGE_PREVIEW;
  return message.body;
}

function sortContacts(contacts: Contact[]): Contact[] {
  return [...contacts].sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bTime - aTime;
  });
}

export function ContactsProvider({
  initialContacts,
  currentUserId,
  activeConversationId,
  children,
}: {
  initialContacts: Contact[];
  currentUserId: string;
  activeConversationId: string | null;
  children: ReactNode;
}) {
  const [contacts, setContacts] = useState(initialContacts);
  const activeConversationIdRef = useRef(activeConversationId);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    setContacts(initialContacts);
  }, [initialContacts]);

  useEffect(() => {
    if (!activeConversationId) return;

    setContacts((prev) =>
      prev.map((contact) =>
        contact.conversationId === activeConversationId
          ? { ...contact, unreadCount: 0 }
          : contact,
      ),
    );

    const supabase = createClient();
    void markConversationRead(supabase, activeConversationId, currentUserId).catch(
      (error) => {
        console.error("[contacts] mark read failed", error);
      },
    );
  }, [activeConversationId, currentUserId]);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    async function subscribe() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled || !session) return;

      channel = supabase
        .channel(`contacts:${currentUserId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          (payload) => {
            const message = payload.new as MessageRow & {
              conversation_id: string;
            };
            if (message.sender_id === currentUserId) return;

            setContacts((prev) => {
              const next = prev.map((contact) => {
                if (contact.conversationId !== message.conversation_id) {
                  return contact;
                }

                const isActive =
                  message.conversation_id === activeConversationIdRef.current;
                return {
                  ...contact,
                  lastMessageAt: message.created_at,
                  preview: messagePreview(message),
                  unreadCount: isActive
                    ? 0
                    : contact.unreadCount + 1,
                };
              });

              return sortContacts(next);
            });
          },
        )
        .subscribe();
    }

    void subscribe();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [activeConversationId, currentUserId]);

  const totalUnread = useMemo(
    () => contacts.reduce((sum, contact) => sum + contact.unreadCount, 0),
    [contacts],
  );

  useEffect(() => {
    document.title =
      totalUnread > 0 ? `(${totalUnread}) CallingApp` : "CallingApp";
  }, [totalUnread]);

  return (
    <ContactsContext.Provider value={contacts}>
      {children}
    </ContactsContext.Provider>
  );
}

export function useContacts() {
  return useContext(ContactsContext);
}