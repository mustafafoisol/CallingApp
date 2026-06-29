import type { SupabaseClient } from "@supabase/supabase-js";

import type { MessageEnvelopeRow } from "@/lib/e2ee/envelope";

const POLL_MS = 5000;
const RETRY_MS = 3000;

export function subscribeToConversationEnvelopes(
  supabase: SupabaseClient,
  options: {
    conversationId: string;
    recipientId: string;
    onEnvelope: (row: MessageEnvelopeRow) => void;
    onStatus: (status: string) => void;
    poll: () => Promise<void>;
  },
): () => void {
  let channel: ReturnType<typeof supabase.channel> | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let cancelled = false;

  async function teardown() {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    if (channel) {
      await supabase.removeChannel(channel);
      channel = null;
    }
  }

  function scheduleReconnect() {
    if (cancelled || retryTimer) return;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      void connect();
    }, RETRY_MS);
  }

  async function connect() {
    if (cancelled) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (cancelled) return;

    if (!session) {
      options.onStatus("no-session");
      return;
    }

    await teardown();

    channel = supabase
      .channel(`envelopes:${options.conversationId}:${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_envelopes",
          filter: `recipient_id=eq.${options.recipientId}`,
        },
        (payload) => {
          const row = payload.new as MessageEnvelopeRow;
          if (row.conversation_id !== options.conversationId) return;
          options.onEnvelope(row);
        },
      )
      .subscribe((status, err) => {
        if (cancelled) return;
        options.onStatus(status);
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          console.error("[chat] realtime failed", status, err);
          scheduleReconnect();
        }
      });
  }

  function onVisible() {
    if (document.visibilityState !== "visible") return;
    void connect();
    void options.poll();
  }

  function onOnline() {
    void connect();
    void options.poll();
  }

  void connect();

  pollTimer = setInterval(() => {
    void options.poll();
  }, POLL_MS);

  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("online", onOnline);

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event) => {
    if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
      void connect();
    }
  });

  return () => {
    cancelled = true;
    subscription.unsubscribe();
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("online", onOnline);
    if (pollTimer) clearInterval(pollTimer);
    void teardown();
  };
}