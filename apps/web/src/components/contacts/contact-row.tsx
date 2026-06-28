import Link from "next/link";
import { ChatAvatar } from "@/components/chat/avatar";
import { formatMessageTime } from "@/lib/chat/format-time";
import { cn } from "@/lib/utils";

export function ContactRow({
  href,
  name,
  imageUrl,
  preview,
  lastMessageAt,
  unreadCount = 0,
  active,
}: {
  href: string;
  name: string;
  imageUrl?: string | null;
  preview?: string | null;
  lastMessageAt?: string | null;
  unreadCount?: number;
  active?: boolean;
}) {
  const timeLabel = lastMessageAt
    ? formatMessageTime(lastMessageAt)
    : null;

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-[13px] px-3 py-2.5 transition-colors ${
        active ? "bg-[var(--chat-active)]" : "hover:bg-[var(--chat-hover)]"
      }`}
    >
      <ChatAvatar name={name} imageUrl={imageUrl} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "truncate text-[15px] text-[var(--chat-text)]",
              unreadCount > 0 ? "font-bold" : "font-semibold",
            )}
          >
            {name}
          </span>
          <div className="flex shrink-0 items-center gap-1.5">
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--chat-coral)] px-1.5 text-[11px] font-semibold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
            {timeLabel && (
              <span className="text-xs text-[#B0A49B]">{timeLabel}</span>
            )}
          </div>
        </div>
        <p
          className={cn(
            "truncate text-[13px]",
            unreadCount > 0
              ? "font-medium text-[var(--chat-text)]"
              : "text-[var(--chat-muted)]",
          )}
        >
          {preview ?? "Start a conversation"}
        </p>
      </div>
    </Link>
  );
}