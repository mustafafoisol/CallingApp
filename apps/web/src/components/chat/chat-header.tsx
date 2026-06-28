import Link from "next/link";
import { ChevronLeft, MoreHorizontal } from "lucide-react";
import { ChatAvatar } from "./avatar";

export function ChatHeader({ friendName }: { friendName: string }) {
  return (
    <header className="flex shrink-0 items-center gap-3.5 border-b border-[var(--chat-border)] bg-[var(--chat-surface)] px-5 py-4">
      <Link
        href="/home"
        className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--chat-muted)] hover:bg-[var(--chat-hover)]"
        aria-label="Back to messages"
      >
        <ChevronLeft className="h-5 w-5" />
      </Link>
      <ChatAvatar name={friendName} size="lg" showOnline />
      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-bold tracking-tight text-[var(--chat-text)]">
          {friendName}
        </p>
        <p className="text-sm font-medium text-[#34B27B]">Active now</p>
      </div>
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--chat-hover)] text-[var(--chat-muted)]"
        aria-label="More options"
      >
        <MoreHorizontal className="h-[18px] w-[18px]" />
      </button>
    </header>
  );
}