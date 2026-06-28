"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";

export function FriendActionsMenu({
  friendId,
  friendshipId,
  friendName,
  variant = "classic",
}: {
  friendId: string;
  friendshipId?: string | null;
  friendName: string;
  variant?: "classic" | "focused";
}) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  async function runAction(path: string, body: Record<string, string>) {
    setBusy(true);
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    setOpen(false);

    if (!res.ok) return;
    router.push("/home");
    router.refresh();
  }

  function handleRemove() {
    if (!friendshipId) return;
    const prompt = `Remove ${friendName}? They can still find you by your user ID and send a new request.`;
    if (!window.confirm(prompt)) return;
    void runAction("/api/friends/remove", { friendshipId });
  }

  function handleBlock() {
    const prompt = `Block ${friendName}? They won't be able to find you or message you.`;
    if (!window.confirm(prompt)) return;
    void runAction("/api/friends/block", { targetUserId: friendId });
  }

  const buttonClass =
    variant === "classic"
      ? "flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[var(--chat-hover)] text-[var(--chat-muted)]"
      : "flex h-10 w-10 items-center justify-center rounded-full bg-[var(--chat-hover)] text-[var(--chat-muted)]";

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        className={buttonClass}
        aria-label="More options"
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal className={variant === "classic" ? "h-[18px] w-[18px]" : "h-[18px] w-[18px]"} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 min-w-[180px] overflow-hidden rounded-[12px] border border-[#EBE3DD] bg-[var(--chat-surface)] py-1 shadow-[0_8px_24px_rgba(60,40,30,0.12)]">
          {friendshipId && (
            <button
              type="button"
              disabled={busy}
              onClick={handleRemove}
              className="block w-full px-4 py-2.5 text-left text-sm text-[var(--chat-text)] hover:bg-[var(--chat-hover)] disabled:opacity-50"
            >
              Remove friend
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={handleBlock}
            className="block w-full px-4 py-2.5 text-left text-sm text-[var(--danger)] hover:bg-[var(--chat-hover)] disabled:opacity-50"
          >
            Block
          </button>
        </div>
      )}
    </div>
  );
}