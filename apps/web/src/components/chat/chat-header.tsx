import Link from "next/link";
import { ChevronLeft, Phone, Search } from "lucide-react";
import { formatLastMessageLabel } from "@/lib/chat/format-time";
import { FriendActionsMenu } from "@/components/friends/friend-actions-menu";
import { ChatAvatar } from "./avatar";

export function ChatHeader({
  friendId,
  friendshipId,
  friendName,
  friendAvatarUrl,
  lastMessageAt,
  variant = "classic",
  canCall = false,
  callDisabled = false,
  onStartCall,
}: {
  friendId: string;
  friendshipId?: string | null;
  friendName: string;
  friendAvatarUrl?: string | null;
  lastMessageAt?: string | null;
  variant?: "classic" | "focused";
  canCall?: boolean;
  callDisabled?: boolean;
  onStartCall?: () => void;
}) {
  const isClassic = variant === "classic";

  return (
    <header
      className={`flex shrink-0 items-center border-b border-[var(--chat-border)] bg-[var(--chat-surface)] ${
        isClassic
          ? "h-[74px] justify-between px-6"
          : "gap-3.5 px-5 py-4"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        {!isClassic && (
          <Link
            href="/home"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--chat-muted)] hover:bg-[var(--chat-hover)]"
            aria-label="Back to messages"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
        )}
        {isClassic && (
          <Link
            href="/home"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--chat-muted)] hover:bg-[var(--chat-hover)] lg:hidden"
            aria-label="Back to messages"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
        )}
        <ChatAvatar
          name={friendName}
          imageUrl={friendAvatarUrl}
          size={isClassic ? "md" : "lg"}
        />
        <div className="min-w-0">
          <p
            className={`truncate font-semibold text-[var(--chat-text)] ${
              isClassic ? "text-base" : "text-lg font-bold tracking-tight"
            }`}
          >
            {friendName}
          </p>
          {lastMessageAt && (
            <p className="truncate text-[12.5px] font-medium text-[#A8998F]">
              {formatLastMessageLabel(lastMessageAt)}
            </p>
          )}
        </div>
      </div>

      {isClassic ? (
        <div className="flex items-center gap-2">
          {canCall && (
            <button
              type="button"
              onClick={onStartCall}
              disabled={callDisabled}
              className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[var(--chat-hover)] text-[var(--chat-coral)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={`Call ${friendName}`}
            >
              <Phone className="h-[17px] w-[17px]" />
            </button>
          )}
          <button
            type="button"
            className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[var(--chat-hover)] text-[var(--chat-muted)]"
            aria-label="Search in conversation"
          >
            <Search className="h-[17px] w-[17px]" />
          </button>
          <FriendActionsMenu
            friendId={friendId}
            friendshipId={friendshipId}
            friendName={friendName}
            variant="classic"
          />
        </div>
      ) : (
        <FriendActionsMenu
          friendId={friendId}
          friendshipId={friendshipId}
          friendName={friendName}
          variant="focused"
        />
      )}
    </header>
  );
}