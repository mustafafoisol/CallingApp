"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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

export function BlockedUsersPanel() {
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

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="text-sm font-medium">Blocked users</h2>
        <p className="text-sm text-muted">
          People you block cannot find you or send requests.
        </p>
      </div>

      {loading && <p className="text-sm text-muted">Loading…</p>}
      {error && (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && blocks.length === 0 && (
        <p className="text-sm text-muted">No blocked users.</p>
      )}

      {blocks.map((entry) => (
        <div
          key={entry.blockId}
          className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {entry.profile.display_name ?? "Unnamed user"}
            </p>
            <p className="truncate text-xs text-muted">@{entry.profile.public_id}</p>
          </div>
          <Button
            variant="secondary"
            disabled={busyId === entry.blockId}
            onClick={() => void unblock(entry.blockId)}
          >
            Unblock
          </Button>
        </div>
      ))}
    </Card>
  );
}