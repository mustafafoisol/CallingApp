"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { dayKey, formatDayLabel } from "@/lib/chat/format-time";
import {
  fetchOlderMessages,
  INITIAL_MESSAGE_LIMIT,
  OLDER_MESSAGE_PAGE_SIZE,
  type MessageRow,
} from "@/lib/chat/messages";
import {
  confirmPendingMessage,
  createPendingMessage,
  markMessageFailed,
  reconcileIncomingMessage,
  type ChatMessage,
} from "@/lib/chat/optimistic";
import { ChatHeader } from "@/components/chat/chat-header";
import { ComposeBar } from "@/components/chat/compose-bar";
import { MessageBubble } from "@/components/chat/message-bubble";

export function ChatView({
  conversationId,
  currentUserId,
  friendName,
  initialMessages,
}: {
  conversationId: string;
  currentUserId: string;
  friendId: string;
  friendName: string;
  initialMessages: MessageRow[];
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
  }, [conversationId, reconcileMessage]);

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
        const unique = older.filter((m) => !existing.has(m.id));
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
      .select("id, sender_id, body, created_at")
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

  let lastDay: string | null = null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--chat-bg)]">
      <ChatHeader friendName={friendName} variant="classic" />

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
              <MessageBubble
                body={message.body}
                mine={mine}
                createdAt={message.created_at}
                status={message.status}
                senderName={friendName}
                variant="classic"
                onRetry={
                  message.status === "failed" && message.clientId
                    ? () => void retryMessage(message.clientId!, message.body)
                    : undefined
                }
              />
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {sendError && (
        <p className="px-5 pb-1 text-sm text-[var(--danger)]" role="alert">
          {sendError}
        </p>
      )}

      <ComposeBar
        value={body}
        onChange={setBody}
        onSubmit={sendMessage}
        placeholder={`Message ${friendName.split(" ")[0]}…`}
      />
    </div>
  );
}