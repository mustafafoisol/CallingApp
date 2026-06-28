"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

interface MessageRow {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export function ChatView({
  conversationId,
  currentUserId,
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
        console.warn("[chat] No session — realtime subscription skipped");
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
          if (status === "SUBSCRIBED") {
            console.debug("[chat] realtime subscribed", conversationId);
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
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

  return (
    <div className="flex h-[calc(100dvh-7rem)] flex-col">
      {realtimeStatus !== "SUBSCRIBED" && realtimeStatus !== "connecting" && (
        <p className="mb-2 text-xs text-muted">
          Live updates unavailable ({realtimeStatus}). New messages appear after
          you send or refresh.
        </p>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-border bg-card p-4">
        {messages.map((message) => {
          const mine = message.sender_id === currentUserId;
          return (
            <div
              key={message.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  mine
                    ? "bg-primary text-primary-foreground"
                    : "bg-[#1a2340] text-foreground"
                }`}
              >
                {message.body}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className="mt-3 flex gap-2">
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type a message"
          disabled={sending}
        />
        <Button type="submit" disabled={sending}>
          {sending ? "..." : "Send"}
        </Button>
      </form>

      {sendError && (
        <p className="mt-2 text-sm text-danger" role="alert">
          {sendError}
        </p>
      )}
    </div>
  );
}