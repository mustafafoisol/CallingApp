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
  clearVaultConversationUnread,
  hydrateContactsFromVault,
  patchContactMessage,
  previewForMessage,
} from "@/lib/contacts/vault-contact-sync";
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
import { normalizeEnvelopeRow } from "@/lib/e2ee/envelope";
import { processEnvelope } from "@/lib/e2ee/receive";
import { openVault } from "@/lib/vault/store";
import type { MessageType } from "@calling-app/core";
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
  notifyLocalMessage: (params: {
    conversationId: string;
    body: string;
    type: MessageType;
    createdAt: string;
  }) => void;
  refreshContacts: () => Promise<void>;
  refreshPending: () => Promise<void>;
  removeIncomingPending: (friendshipId: string) => void;
  removeOutgoingPending: (friendshipId: string) => void;
}

const ContactsContext = createContext<ContactsContextValue | null>(null);

function legacyMessagePreview(message: MessageRow): string {
  if (message.removed_at) return REMOVED_MESSAGE_LABEL;
  if (message.type === "image") return IMAGE_MESSAGE_PREVIEW;
  return message.body;
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

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const vault = await openVault(currentUserId);
        const hydrated = await hydrateContactsFromVault(vault, initialContacts);
        if (!cancelled) setContacts(hydrated);
      } catch (error) {
        console.error("[contacts] vault hydrate failed", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, initialContacts]);

  const notifyLocalMessage = useCallback(
    (params: {
      conversationId: string;
      body: string;
      type: MessageType;
      createdAt: string;
    }) => {
      setContacts((prev) =>
        patchContactMessage(prev, params.conversationId, {
          preview: previewForMessage(params.body, params.type),
          lastMessageAt: params.createdAt,
          unreadDelta: 0,
          isActive: false,
        }),
      );
    },
    [],
  );

  const refreshContacts = useCallback(async () => {
    const supabase = createClient();
    const nextContacts = await loadContacts(supabase, currentUserId);
    try {
      const vault = await openVault(currentUserId);
      setContacts(await hydrateContactsFromVault(vault, nextContacts));
    } catch (error) {
      console.error("[contacts] vault refresh failed", error);
      setContacts(nextContacts);
    }
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
    void (async () => {
      try {
        await markConversationRead(supabase, activeConversationId, currentUserId);
        const vault = await openVault(currentUserId);
        await clearVaultConversationUnread(vault, activeConversationId);
      } catch (error) {
        console.error("[contacts] mark read failed", error);
      }
    })();
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

    async function handleIncomingEnvelope(
      row: ReturnType<typeof normalizeEnvelopeRow>,
    ) {
      if (row.sender_id === currentUserId) return;

      const isActive =
        row.conversation_id === activeConversationIdRef.current;

      if (
        shouldPlayMessageSound({
          senderId: row.sender_id,
          currentUserId,
          isActive,
        })
      ) {
        playMessageSound();
      }

      try {
        const vault = await openVault(currentUserId);
        const result = await processEnvelope(supabase, vault, row);
        const vaultConv = await vault.conversations.get(row.conversation_id);
        const preview = previewForMessage(result.body, row.type);

        if (!isActive) {
          const contact = contactsRef.current.find(
            (item) => item.conversationId === row.conversation_id,
          );

          maybeShowMessageNotification({
            messageId: row.id,
            conversationId: row.conversation_id,
            senderName: contact?.friend.display_name ?? "New message",
            body: preview,
            iconUrl: contact?.friend.avatar_url ?? null,
            chatUrl: `/chat/${row.conversation_id}`,
          });
        }

        setContacts((prev) =>
          patchContactMessage(prev, row.conversation_id, {
            preview,
            lastMessageAt: result.createdAt,
            isActive,
            unreadCount: isActive ? 0 : vaultConv?.unreadCount,
          }),
        );
      } catch (error) {
        console.error("[contacts] envelope preview failed", error);
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
            if (message.sender_id === currentUserId || message.type === "text") {
              return;
            }

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
                body: legacyMessagePreview(message),
                iconUrl: contact?.friend.avatar_url ?? null,
                chatUrl: `/chat/${message.conversation_id}`,
              });
            }

            setContacts((prev) =>
              patchContactMessage(prev, message.conversation_id, {
                preview: legacyMessagePreview(message),
                lastMessageAt: message.created_at,
                isActive,
                unreadDelta: isActive ? 0 : 1,
              }),
            );
          },
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "message_envelopes",
            filter: `recipient_id=eq.${currentUserId}`,
          },
          (payload) => {
            const row = normalizeEnvelopeRow(
              payload.new as Parameters<typeof normalizeEnvelopeRow>[0],
            );
            void handleIncomingEnvelope(row).catch((error) => {
              console.error("[contacts] envelope realtime failed", error);
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
      notifyLocalMessage,
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
      notifyLocalMessage,
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