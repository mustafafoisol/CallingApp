"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { dayKey, formatDayLabel } from "@/lib/chat/format-time";
import {
  fetchOlderMessages,
  INITIAL_MESSAGE_LIMIT,
  OLDER_MESSAGE_PAGE_SIZE,
  type MessageRow,
} from "@/lib/chat/messages";
import {
  compressImageForChat,
  ImageCompressionError,
} from "@/lib/chat/compress-image";
import {
  confirmPendingMessage,
  createPendingImageMessage,
  createPendingMessage,
  markMessageFailed,
  reconcileIncomingMessage,
  type ChatMessage,
} from "@/lib/chat/optimistic";
import { uploadChatImage } from "@/lib/chat/upload-image";
import { ChatHeader } from "@/components/chat/chat-header";
import { ComposeBar } from "@/components/chat/compose-bar";
import { MessageActionsMenu } from "@/components/chat/message-actions-menu";
import { MessageBubble } from "@/components/chat/message-bubble";
import { hideMessage } from "@/lib/chat/hide-message";
import { removeMessage } from "@/lib/chat/remove-message";

export function ChatView({
  conversationId,
  currentUserId,
  friendName,
  initialMessages,
  initialHiddenMessageIds = [],
}: {
  conversationId: string;
  currentUserId: string;
  friendId: string;
  friendName: string;
  initialMessages: MessageRow[];
  initialHiddenMessageIds?: string[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialMessages.map((message) => ({ ...message, status: "confirmed" })),
  );
  const [body, setBody] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<string>("connecting");
  const [hasMore, setHasMore] = useState(
    initialMessages.length >= INITIAL_MESSAGE_LIMIT,
  );
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loadOlderError, setLoadOlderError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [sendingImage, setSendingImage] = useState(false);
  const hiddenMessageIdsRef = useRef(new Set(initialHiddenMessageIds));
  const pendingImageFilesRef = useRef(new Map<string, File>());
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollToBottomRef = useRef(false);
  const pendingScrollRestore = useRef<{ height: number; top: number } | null>(
    null,
  );

  const reconcileMessage = useCallback(
    (row: MessageRow) => {
      scrollToBottomRef.current = true;
      setMessages((prev) =>
        reconcileIncomingMessage(prev, row, currentUserId),
      );
    },
    [currentUserId],
  );

  const applyMessageUpdate = useCallback((row: MessageRow) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === row.id ? { ...m, ...row, status: "confirmed" } : m)),
    );
  }, []);

  const isHidden = useCallback((messageId: string) => {
    return hiddenMessageIdsRef.current.has(messageId);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, []);

  useEffect(() => {
    if (pendingScrollRestore.current && scrollContainerRef.current) {
      const { height, top } = pendingScrollRestore.current;
      pendingScrollRestore.current = null;
      const el = scrollContainerRef.current;
      el.scrollTop = top + (el.scrollHeight - height);
      return;
    }

    if (scrollToBottomRef.current) {
      scrollToBottomRef.current = false;
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    async function subscribe() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (!session) {
        setRealtimeStatus("no-session");
        return;
      }

      channel = supabase
        .channel(`messages:${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            reconcileMessage(payload.new as MessageRow);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const row = payload.new as MessageRow;
            if (row.removed_at) applyMessageUpdate(row);
          },
        )
        .subscribe((status, err) => {
          if (cancelled) return;
          setRealtimeStatus(status);
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.error("[chat] realtime failed", status, err);
          }
        });
    }

    void subscribe();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [conversationId, reconcileMessage, applyMessageUpdate]);

  async function loadOlderMessages() {
    if (loadingOlder || !hasMore || messages.length === 0) return;

    const oldest = messages[0];
    const scrollEl = scrollContainerRef.current;
    if (scrollEl) {
      pendingScrollRestore.current = {
        height: scrollEl.scrollHeight,
        top: scrollEl.scrollTop,
      };
    }

    setLoadingOlder(true);
    setLoadOlderError(null);

    try {
      const supabase = createClient();
      const older = await fetchOlderMessages(
        supabase,
        conversationId,
        oldest,
      );

      setMessages((prev) => {
        const existing = new Set(prev.map((m) => m.id));
        const unique = older.filter(
          (m) => !existing.has(m.id) && !isHidden(m.id),
        );
        return [...unique, ...prev];
      });
      setHasMore(older.length === OLDER_MESSAGE_PAGE_SIZE);
    } catch (err) {
      pendingScrollRestore.current = null;
      setLoadOlderError(
        err instanceof Error ? err.message : "Could not load older messages.",
      );
    } finally {
      setLoadingOlder(false);
    }
  }

  const MAX_MESSAGE_LENGTH = 4000;

  function formatSendError(message: string) {
    return message.includes("policy")
      ? "Message not sent — friendship may not be accepted or session expired."
      : message;
  }

  async function sendText(text: string, existingClientId?: string) {
    const clientId = existingClientId ?? crypto.randomUUID();

    if (!existingClientId) {
      const pending = createPendingMessage(clientId, currentUserId, text);
      scrollToBottomRef.current = true;
      setMessages((prev) => [...prev, pending]);
    } else {
      setMessages((prev) =>
        prev.map((message) =>
          message.clientId === clientId
            ? { ...message, status: "pending" }
            : message,
        ),
      );
    }

    setSendError(null);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        body: text,
        type: "text",
      })
      .select(
        "id, sender_id, body, type, attachment_url, created_at, removed_at",
      )
      .single();

    if (error) {
      setMessages((prev) => markMessageFailed(prev, clientId));
      if (!existingClientId) {
        setSendError(formatSendError(error.message));
      }
      return;
    }

    if (data) {
      scrollToBottomRef.current = true;
      setMessages((prev) => confirmPendingMessage(prev, clientId, data));
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;

    if (text.length > MAX_MESSAGE_LENGTH) {
      setSendError(`Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`);
      return;
    }

    setBody("");
    await sendText(text);
  }

  async function retryMessage(clientId: string, text: string) {
    setSendError(null);
    await sendText(text, clientId);
  }

  async function sendImage(file: File, existingClientId?: string) {
    const clientId = existingClientId ?? crypto.randomUUID();
    let previewUrl: string | null = null;

    if (!existingClientId) {
      previewUrl = URL.createObjectURL(file);
      pendingImageFilesRef.current.set(clientId, file);
      scrollToBottomRef.current = true;
      setMessages((prev) => [
        ...prev,
        createPendingImageMessage(clientId, currentUserId, previewUrl!),
      ]);
    } else {
      const stored = pendingImageFilesRef.current.get(clientId);
      if (!stored) return;
      file = stored;
      setMessages((prev) =>
        prev.map((m) =>
          m.clientId === clientId ? { ...m, status: "pending" } : m,
        ),
      );
    }

    setSendError(null);
    setSendingImage(true);

    try {
      const compressed = await compressImageForChat(file);
      const supabase = createClient();
      const attachmentUrl = await uploadChatImage(
        supabase,
        compressed,
        conversationId,
      );
      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          body: "",
          type: "image",
          attachment_url: attachmentUrl,
        })
        .select(
          "id, sender_id, body, type, attachment_url, created_at, removed_at",
        )
        .single();

      if (error) throw error;

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      pendingImageFilesRef.current.delete(clientId);

      if (data) {
        scrollToBottomRef.current = true;
        setMessages((prev) => confirmPendingMessage(prev, clientId, data));
      }
    } catch (err) {
      setMessages((prev) => markMessageFailed(prev, clientId));
      if (!existingClientId) {
        const message =
          err instanceof ImageCompressionError
            ? err.message
            : err instanceof Error
              ? formatSendError(err.message)
              : "Could not send image.";
        setSendError(message);
      }
    } finally {
      setSendingImage(false);
    }
  }

  async function handleDeleteMessage(message: ChatMessage) {
    if (message.status !== "confirmed" || message.id.startsWith("pending-")) {
      return;
    }

    setDeleteError(null);
    const supabase = createClient();
    const snapshot = messages;

    if (message.sender_id === currentUserId) {
      const removedAt = new Date().toISOString();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id
            ? { ...m, removed_at: removedAt, body: "", status: "confirmed" }
            : m,
        ),
      );

      const { error } = await removeMessage(supabase, message.id);
      if (error) {
        setMessages(snapshot);
        setDeleteError(error.message);
      }
      return;
    }

    hiddenMessageIdsRef.current.add(message.id);
    setMessages((prev) => prev.filter((m) => m.id !== message.id));

    const { error } = await hideMessage(supabase, message.id, currentUserId);
    if (error) {
      hiddenMessageIdsRef.current.delete(message.id);
      setMessages(snapshot);
      setDeleteError(error.message);
    }
  }

  const lastMessageAt = useMemo(() => {
    if (messages.length === 0) return null;
    return messages[messages.length - 1].created_at;
  }, [messages]);

  let lastDay: string | null = null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--chat-bg)]">
      <ChatHeader
        friendName={friendName}
        lastMessageAt={lastMessageAt}
        variant="classic"
      />

      {realtimeStatus !== "SUBSCRIBED" && realtimeStatus !== "connecting" && (
        <p className="bg-[#FCEDE8] px-4 py-2 text-center text-xs text-[var(--chat-muted)]">
          Live updates unavailable — refresh if messages seem stale.
        </p>
      )}

      <div
        ref={scrollContainerRef}
        className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-7 py-5"
      >
        {hasMore && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => void loadOlderMessages()}
              disabled={loadingOlder}
              className="rounded-full border border-[#EBE3DD] bg-[var(--chat-surface)] px-4 py-2 text-sm font-medium text-[var(--chat-muted)] transition-colors hover:bg-[var(--chat-hover)] disabled:opacity-50"
            >
              {loadingOlder ? "Loading…" : "Load older messages"}
            </button>
          </div>
        )}

        {loadOlderError && (
          <p className="text-center text-sm text-[var(--danger)]" role="alert">
            {loadOlderError}
          </p>
        )}

        {messages.length === 0 && (
          <p className="text-center text-sm text-[#A8998F]">
            No messages yet. Say hello!
          </p>
        )}
        {messages.map((message) => {
          const dk = dayKey(message.created_at);
          const showDay = dk !== lastDay;
          lastDay = dk;
          const mine = message.sender_id === currentUserId;

          return (
            <div key={message.id} className="flex flex-col gap-4">
              {showDay && (
                <div className="flex justify-center">
                  <span className="rounded-full bg-[#F1E9E3] px-3.5 py-1.5 text-xs font-medium text-[#A8998F]">
                    {formatDayLabel(message.created_at)}
                  </span>
                </div>
              )}
              <div
                className={`group flex w-full items-end gap-1 ${mine ? "justify-end" : "justify-start"}`}
              >
                <MessageBubble
                  body={message.body}
                  mine={mine}
                  createdAt={message.created_at}
                  status={message.status}
                  senderName={friendName}
                  variant="classic"
                  removed={!!message.removed_at}
                  imageUrl={
                    message.type === "image" ? message.attachment_url : undefined
                  }
                  onRetry={
                    message.status === "failed" && message.clientId
                      ? () =>
                          void (message.type === "image"
                            ? sendImage(
                                pendingImageFilesRef.current.get(
                                  message.clientId!,
                                )!,
                                message.clientId,
                              )
                            : retryMessage(message.clientId!, message.body))
                      : undefined
                  }
                />
                {!message.removed_at && message.status === "confirmed" && (
                  <MessageActionsMenu
                    isOwn={mine}
                    onDelete={() => void handleDeleteMessage(message)}
                  />
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {(sendError || deleteError) && (
        <p className="px-5 pb-1 text-sm text-[var(--danger)]" role="alert">
          {sendError ?? deleteError}
        </p>
      )}

      <ComposeBar
        value={body}
        onChange={setBody}
        onSubmit={sendMessage}
        onSendImage={(file) => void sendImage(file)}
        sending={sendingImage}
        placeholder={`Message ${friendName.split(" ")[0]}…`}
      />
    </div>
  );
}