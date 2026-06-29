"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChatAvatar } from "@/components/chat/avatar";
import { useContactsContext } from "@/contexts/contacts-context";
import { bootstrapAndPrefetchPeer } from "@/lib/e2ee/bootstrap-client";
import { createClient } from "@/lib/supabase/client";

export function PendingRequestsSidebar() {
  const router = useRouter();
  const {
    incomingPending,
    outgoingPending,
    removeIncomingPending,
    refreshContacts,
    refreshPending,
  } = useContactsContext();
  const [respondingId, setRespondingId] = useState<string | null>(null);

  if (incomingPending.length === 0 && outgoingPending.length === 0) {
    return null;
  }

  async function respond(
    friendshipId: string,
    peerId: string,
    action: "accept" | "reject",
  ) {
    setRespondingId(friendshipId);
    try {
      const res = await fetch("/api/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendshipId, action }),
      });

      if (!res.ok) return;

      if (action === "accept") {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await bootstrapAndPrefetchPeer(user.id, peerId);
        }
        removeIncomingPending(friendshipId);
        await refreshContacts();
        await refreshPending();

        if (user) {
          const { loadContacts } = await import("@/lib/contacts/load-contacts");
          const contacts = await loadContacts(supabase, user.id);
          const contact = contacts.find(
            (item) => item.friendshipId === friendshipId,
          );
          if (contact?.conversationId) {
            router.push(`/chat/${contact.conversationId}`);
          }
        }
        return;
      }

      removeIncomingPending(friendshipId);
      await refreshPending();
    } finally {
      setRespondingId(null);
    }
  }

  return (
    <div className="mx-1 mb-2 rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-surface)] px-3 py-3">
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-[var(--chat-muted)]">
        Pending requests
      </h2>

      {incomingPending.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {incomingPending.map((request) => {
            const name = request.displayName ?? "Friend";
            const busy = respondingId === request.friendshipId;

            return (
              <div
                key={request.friendshipId}
                className="flex items-center gap-2.5 rounded-[13px] bg-[#FBF6F2] px-2.5 py-2.5"
              >
                <ChatAvatar name={name} imageUrl={request.avatarUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--chat-text)]">
                    {name}
                  </p>
                  <p className="truncate text-xs text-[var(--chat-muted)]">
                    @{request.publicId}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void respond(request.friendshipId, request.peerId, "accept")
                    }
                    className="rounded-full bg-[var(--chat-coral)] px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void respond(request.friendshipId, request.peerId, "reject")
                    }
                    className="rounded-full bg-[var(--chat-hover)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--chat-muted)] disabled:opacity-50"
                  >
                    Ignore
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {outgoingPending.length > 0 && (
        <div
          className={
            incomingPending.length > 0
              ? "mt-2 flex flex-col gap-1.5 border-t border-[#F1E9E3] pt-2"
              : "flex flex-col gap-1.5"
          }
        >
          {outgoingPending.map((request) => (
            <div
              key={request.friendshipId}
              className="flex items-center gap-2.5 rounded-[13px] px-2.5 py-2"
            >
              <ChatAvatar
                name={request.displayName ?? request.publicId}
                imageUrl={request.avatarUrl}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--chat-text)]">
                  {request.displayName ?? "Friend"}
                </p>
                <p className="truncate text-xs text-[var(--chat-muted)]">
                  Waiting for @{request.publicId}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-[var(--chat-hover)] px-2 py-1 text-[11px] font-medium text-[var(--chat-muted)]">
                Sent
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}