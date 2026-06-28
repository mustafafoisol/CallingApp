"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

interface BlockedEntry {
  blockId: string;
  profile: {
    id: string;
    public_id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export function BlockedUsersPanel({ embedded = false }: { embedded?: boolean }) {
  const [blocks, setBlocks] = useState<BlockedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadBlocks() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/friends/blocked");
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Could not load blocked users");
      return;
    }

    setBlocks(data.blocks ?? []);
  }

  useEffect(() => {
    void loadBlocks();
  }, []);

  async function unblock(blockId: string) {
    setBusyId(blockId);
    const res = await fetch("/api/friends/unblock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockId }),
    });
    setBusyId(null);

    if (!res.ok) return;
    setBlocks((prev) => prev.filter((entry) => entry.blockId !== blockId));
  }

  const content = (
    <>
      <div>
        <h2 className="text-[12.5px] font-semibold text-[var(--chat-muted)]">
          Blocked users
        </h2>
        <p className="mt-1 text-xs text-[#A8998F]">
          People you block cannot find you or send requests.
        </p>
      </div>

      {loading && <p className="text-sm text-[var(--chat-muted)]">Loading…</p>}
      {error && (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && blocks.length === 0 && (
        <p className="text-sm text-[var(--chat-muted)]">No blocked users.</p>
      )}

      {blocks.map((entry) => (
        <div
          key={entry.blockId}
          className="flex items-center justify-between gap-3 rounded-[13px] border border-[#EBE3DD] bg-[#F8F2ED] px-3.5 py-2.5"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--chat-text)]">
              {entry.profile.display_name ?? "Unnamed user"}
            </p>
            <p className="truncate text-xs text-[var(--chat-muted)]">
              @{entry.profile.public_id}
            </p>
          </div>
          <button
            type="button"
            disabled={busyId === entry.blockId}
            onClick={() => void unblock(entry.blockId)}
            className="shrink-0 rounded-[21px] border border-[#EBE3DD] bg-white px-4 py-2 text-[13px] font-semibold text-[var(--chat-muted)] disabled:opacity-50"
          >
            Unblock
          </button>
        </div>
      ))}
    </>
  );

  if (embedded) {
    return <div className="space-y-3">{content}</div>;
  }

  return <Card className="space-y-3">{content}</Card>;
}