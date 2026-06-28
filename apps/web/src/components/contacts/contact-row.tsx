import Link from "next/link";
import { ChatAvatar } from "@/components/chat/avatar";
import { formatMessageTime } from "@/lib/chat/format-time";

export function ContactRow({
  href,
  name,
  preview,
  lastMessageAt,
  selected,
}: {
  href: string;
  name: string;
  preview?: string | null;
  lastMessageAt?: string | null;
  selected?: boolean;
}) {
  const timeLabel = lastMessageAt
    ? formatMessageTime(lastMessageAt)
    : null;

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-[13px] px-3 py-2.5 transition-colors ${
        selected ? "bg-[var(--chat-active)]" : "hover:bg-[var(--chat-hover)]"
      }`}
    >
      <ChatAvatar name={name} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[15px] font-semibold text-[var(--chat-text)]">
            {name}
          </span>
          {timeLabel && (
            <span className="shrink-0 text-xs text-[#B0A49B]">{timeLabel}</span>
          )}
        </div>
        <p className="truncate text-[13px] text-[var(--chat-muted)]">
          {preview ?? "Start a conversation"}
        </p>
      </div>
    </Link>
  );
}