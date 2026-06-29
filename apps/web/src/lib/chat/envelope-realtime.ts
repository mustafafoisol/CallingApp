import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeEnvelopeRow, type MessageEnvelopeRow } from "@/lib/e2ee/envelope";

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
  let connectPromise: Promise<void> | null = null;
  let cancelled = false;
  let intentionalTeardown = false;

  function reportStatus(status: string) {
    if (status === "SUBSCRIBED") {
      options.onStatus(status);
      return;
    }
    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      options.onStatus(status);
    }
  }

  async function teardown() {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    if (channel) {
      intentionalTeardown = true;
      await supabase.removeChannel(channel);
      intentionalTeardown = false;
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

  async function connectNow() {
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
      .channel(`envelopes:${options.conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_envelopes",
          filter: `recipient_id=eq.${options.recipientId}`,
        },
        (payload) => {
          const row = normalizeEnvelopeRow(
            payload.new as Parameters<typeof normalizeEnvelopeRow>[0],
          );
          if (row.conversation_id !== options.conversationId) return;
          options.onEnvelope(row);
        },
      )
      .subscribe((status, err) => {
        if (cancelled) return;
        if (status === "CLOSED" && intentionalTeardown) return;
        reportStatus(status);
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("[chat] realtime failed", status, err);
          scheduleReconnect();
        } else if (status === "CLOSED") {
          scheduleReconnect();
        }
      });
  }

  function connect() {
    if (cancelled) return Promise.resolve();
    if (connectPromise) return connectPromise;
    connectPromise = connectNow().finally(() => {
      connectPromise = null;
    });
    return connectPromise;
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

  void connect().then(() => options.poll());

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