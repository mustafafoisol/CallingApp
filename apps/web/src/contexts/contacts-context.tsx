"use client";

import {
  createContext,
  useCallback,
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
import { loadContacts, type Contact } from "@/lib/contacts/load-contacts";
import {
  loadIncomingPending,
  loadOutgoingPending,
} from "@/lib/contacts/load-pending";
import type {
  IncomingPendingRequest,
  OutgoingPendingRequest,
} from "@/lib/contacts/pending-types";
import { markConversationRead } from "@/lib/contacts/mark-conversation-read";
import { bootstrapAndPrefetchPeer } from "@/lib/e2ee/bootstrap-client";
import { parseUserEventRow } from "@/lib/events/parse-user-event";
import {
  maybeShowFriendAcceptedNotification,
  maybeShowMessageNotification,
} from "@/lib/notifications/browser-message-notification";
import { playMessageSound } from "@/lib/notifications/message-sound";
import { shouldPlayMessageSound } from "@/lib/notifications/should-play-message-sound";

interface ContactsContextValue {
  contacts: Contact[];
  incomingPending: IncomingPendingRequest[];
  outgoingPending: OutgoingPendingRequest[];
  addOutgoingPending: (request: OutgoingPendingRequest) => void;
  refreshContacts: () => Promise<void>;
  refreshPending: () => Promise<void>;
  removeIncomingPending: (friendshipId: string) => void;
  removeOutgoingPending: (friendshipId: string) => void;
}

const ContactsContext = createContext<ContactsContextValue | null>(null);

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
  const [incomingPending, setIncomingPending] = useState<IncomingPendingRequest[]>(
    [],
  );
  const [outgoingPending, setOutgoingPending] = useState<OutgoingPendingRequest[]>(
    [],
  );
  const contactsRef = useRef(contacts);
  const activeConversationIdRef = useRef(activeConversationId);

  useEffect(() => {
    contactsRef.current = contacts;
  }, [contacts]);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    setContacts(initialContacts);
  }, [initialContacts]);

  const refreshContacts = useCallback(async () => {
    const supabase = createClient();
    const nextContacts = await loadContacts(supabase, currentUserId);
    setContacts(nextContacts);
  }, [currentUserId]);

  const refreshPending = useCallback(async () => {
    const supabase = createClient();
    const [incoming, outgoing] = await Promise.all([
      loadIncomingPending(supabase, currentUserId),
      loadOutgoingPending(supabase, currentUserId),
    ]);
    setIncomingPending(incoming);
    setOutgoingPending(outgoing);
  }, [currentUserId]);

  const addOutgoingPending = useCallback((request: OutgoingPendingRequest) => {
    setOutgoingPending((prev) => {
      if (prev.some((item) => item.friendshipId === request.friendshipId)) {
        return prev;
      }
      return [...prev, request];
    });
  }, []);

  const removeIncomingPending = useCallback((friendshipId: string) => {
    setIncomingPending((prev) =>
      prev.filter((item) => item.friendshipId !== friendshipId),
    );
  }, []);

  const removeOutgoingPending = useCallback((friendshipId: string) => {
    setOutgoingPending((prev) =>
      prev.filter((item) => item.friendshipId !== friendshipId),
    );
  }, []);

  useEffect(() => {
    void refreshPending();
  }, [refreshPending]);

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

    async function handleAddFriendEvent(
      event: NonNullable<ReturnType<typeof parseUserEventRow>>,
    ) {
      const payload = event.payload;

      if (event.status === "sent") {
        setIncomingPending((prev) => {
          if (prev.some((item) => item.friendshipId === payload.friendship_id)) {
            return prev;
          }
          return [
            ...prev,
            {
              friendshipId: payload.friendship_id,
              peerId: payload.peer_id,
              displayName: payload.peer_display_name,
              publicId: payload.peer_public_id,
              avatarUrl: payload.peer_avatar_url,
            },
          ];
        });
        await bootstrapAndPrefetchPeer(currentUserId, payload.peer_id);
        return;
      }

      if (event.status === "ignored") {
        removeOutgoingPending(payload.friendship_id);
        return;
      }

      if (event.status === "accepted") {
        removeOutgoingPending(payload.friendship_id);
        await refreshContacts();
        await bootstrapAndPrefetchPeer(currentUserId, payload.peer_id);

        const friendName = payload.peer_display_name ?? "New friend";
        const chatUrl = payload.conversation_id
          ? `/chat/${payload.conversation_id}`
          : "/home";

        maybeShowFriendAcceptedNotification({
          friendshipId: payload.friendship_id,
          friendName,
          iconUrl: payload.peer_avatar_url,
          chatUrl,
        });
      }
    }

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

            const isActive =
              message.conversation_id === activeConversationIdRef.current;

            if (
              shouldPlayMessageSound({
                senderId: message.sender_id,
                currentUserId,
                isActive,
              })
            ) {
              playMessageSound();
            }

            if (!isActive) {
              const contact = contactsRef.current.find(
                (item) => item.conversationId === message.conversation_id,
              );

              maybeShowMessageNotification({
                messageId: message.id,
                conversationId: message.conversation_id,
                senderName: contact?.friend.display_name ?? "New message",
                body: messagePreview(message),
                iconUrl: contact?.friend.avatar_url ?? null,
                chatUrl: `/chat/${message.conversation_id}`,
              });
            }

            setContacts((prev) => {
              const next = prev.map((contact) => {
                if (contact.conversationId !== message.conversation_id) {
                  return contact;
                }

                return {
                  ...contact,
                  lastMessageAt: message.created_at,
                  preview: messagePreview(message),
                  unreadCount: isActive ? 0 : contact.unreadCount + 1,
                };
              });

              return sortContacts(next);
            });
          },
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "user_events",
            filter: `recipient_id=eq.${currentUserId}`,
          },
          (payload) => {
            const event = parseUserEventRow(payload.new);
            if (!event) return;
            void handleAddFriendEvent(event).catch((error) => {
              console.error("[contacts] add-friend event failed", error);
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
  }, [
    currentUserId,
    refreshContacts,
    removeOutgoingPending,
  ]);

  const totalUnread = useMemo(
    () => contacts.reduce((sum, contact) => sum + contact.unreadCount, 0),
    [contacts],
  );

  useEffect(() => {
    document.title =
      totalUnread > 0 ? `(${totalUnread}) CallingApp` : "CallingApp";
  }, [totalUnread]);

  const value = useMemo(
    () => ({
      contacts,
      incomingPending,
      outgoingPending,
      addOutgoingPending,
      refreshContacts,
      refreshPending,
      removeIncomingPending,
      removeOutgoingPending,
    }),
    [
      contacts,
      incomingPending,
      outgoingPending,
      addOutgoingPending,
      refreshContacts,
      refreshPending,
      removeIncomingPending,
      removeOutgoingPending,
    ],
  );

  return (
    <ContactsContext.Provider value={value}>{children}</ContactsContext.Provider>
  );
}

export function useContactsContext() {
  const value = useContext(ContactsContext);
  if (!value) {
    throw new Error("useContactsContext must be used within ContactsProvider");
  }
  return value;
}

export function useContacts() {
  return useContactsContext().contacts;
}