"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { dayKey, formatDayLabel } from "@/lib/chat/format-time";
import { ChatHeader } from "@/components/chat/chat-header";
import { ComposeBar } from "@/components/chat/compose-bar";
import { MessageBubble } from "@/components/chat/message-bubble";

interface MessageRow {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

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
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<string>("connecting");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  function appendMessage(row: MessageRow) {
    setMessages((prev) =>
      prev.some((m) => m.id === row.id) ? prev : [...prev, row],
    );
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
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
            appendMessage(payload.new as MessageRow);
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
  }, [conversationId]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || sending) return;

    setSending(true);
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

    setSending(false);

    if (error) {
      setSendError(
        error.message.includes("policy")
          ? "Message not sent — friendship may not be accepted or session expired."
          : error.message,
      );
      return;
    }

    if (data) {
      appendMessage(data);
      setBody("");
    }
  }

  let lastDay: string | null = null;

  return (
    <div className="mx-auto flex h-dvh max-w-lg flex-col bg-[var(--chat-bg)]">
      <ChatHeader friendName={friendName} />

      {realtimeStatus !== "SUBSCRIBED" && realtimeStatus !== "connecting" && (
        <p className="bg-[#FCEDE8] px-4 py-2 text-center text-xs text-[var(--chat-muted)]">
          Live updates unavailable — refresh if messages seem stale.
        </p>
      )}

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-6">
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
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#A8998F]">
                    {formatDayLabel(message.created_at)}
                  </span>
                </div>
              )}
              <MessageBubble
                body={message.body}
                mine={mine}
                createdAt={message.created_at}
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
        sending={sending}
      />
    </div>
  );
}