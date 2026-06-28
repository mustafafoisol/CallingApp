"use client";

import { MoreHorizontal } from "lucide-react";

export function MessageActionsMenu({
  isOwn,
  onDelete,
  disabled,
}: {
  isOwn: boolean;
  onDelete: () => void;
  disabled?: boolean;
}) {
  function handleClick() {
    const prompt = isOwn
      ? "Remove this message for everyone? It will show as \"Message removed\"."
      : "Hide this message? Only you will stop seeing it.";
    if (!window.confirm(prompt)) return;
    onDelete();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--chat-muted)] opacity-0 transition-opacity hover:bg-[var(--chat-hover)] group-hover:opacity-100 focus:opacity-100 disabled:opacity-30"
      aria-label={isOwn ? "Remove message" : "Hide message"}
    >
      <MoreHorizontal className="h-4 w-4" />
    </button>
  );
}