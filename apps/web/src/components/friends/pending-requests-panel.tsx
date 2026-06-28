"use client";

import { useCallback, useEffect, useState } from "react";
import { ChatAvatar } from "@/components/chat/avatar";
import { createClient } from "@/lib/supabase/client";

interface PendingRequest {
  id: string;
  requester: {
    display_name: string | null;
    public_id: string;
  };
}

export function PendingRequestsPanel({
  onResponded,
}: {
  onResponded?: () => void;
}) {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("friendships")
      .select(
        "id, requester:profiles!friendships_requester_id_fkey(display_name, public_id)",
      )
      .eq("addressee_id", user.id)
      .eq("status", "pending");

    setRequests((data as PendingRequest[] | null) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function respond(friendshipId: string, action: "accept" | "reject") {
    setRespondingId(friendshipId);
    try {
      await fetch("/api/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendshipId, action }),
      });
      await load();
      onResponded?.();
    } finally {
      setRespondingId(null);
    }
  }

  if (requests.length === 0) return null;

  return (
    <div className="border-t border-[#F1E9E3] px-6 pt-4 pb-5">
      <h2 className="mb-3 text-sm font-semibold text-[var(--chat-text)]">
        Pending requests
      </h2>
      <div className="flex flex-col gap-2">
        {requests.map((req) => {
          const name = req.requester.display_name ?? "Friend";
          const busy = respondingId === req.id;

          return (
            <div
              key={req.id}
              className="flex items-center gap-3 rounded-[13px] border border-[#F1E9E3] bg-[#FBF6F2] px-3.5 py-3"
            >
              <ChatAvatar name={name} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-[var(--chat-text)]">
                  {name}
                </p>
                <p className="truncate text-[13px] text-[var(--chat-muted)]">
                  @{req.requester.public_id}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void respond(req.id, "accept")}
                  className="rounded-full bg-[var(--chat-coral)] px-3.5 py-2 text-xs font-semibold text-white shadow-[0_2px_8px_rgba(242,107,82,0.3)] disabled:opacity-50"
                >
                  Accept
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void respond(req.id, "reject")}
                  className="rounded-full bg-[var(--chat-hover)] px-3.5 py-2 text-xs font-semibold text-[var(--chat-muted)] disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}