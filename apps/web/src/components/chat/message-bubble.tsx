import { ChatAvatar } from "@/components/chat/avatar";
import { formatMessageTime } from "@/lib/chat/format-time";
import { REMOVED_MESSAGE_LABEL } from "@/lib/chat/messages";
import type { MessageStatus } from "@/lib/chat/optimistic";

export function MessageBubble({
  body,
  mine,
  createdAt,
  status = "confirmed",
  onRetry,
  senderName,
  variant = "classic",
  removed,
  imageUrl,
}: {
  body: string;
  mine: boolean;
  createdAt: string;
  status?: MessageStatus;
  onRetry?: () => void;
  senderName?: string;
  variant?: "classic" | "focused";
  removed?: boolean;
  imageUrl?: string | null;
}) {
  const pending = status === "pending";
  const failed = status === "failed";
  const isClassic = variant === "classic";
  const displayBody = removed ? REMOVED_MESSAGE_LABEL : body;
  const isImage = !removed && !!imageUrl;
  const bubbleMaxWidth = isImage ? "max-w-[min(520px,85%)]" : "max-w-[74%]";
  const bubbleMaxWidthFallback = isImage ? "max-w-[min(520px,85%)]" : "max-w-[78%]";

  const bubble = isImage ? (
    <div
      className={`overflow-hidden border border-[#EDE5DF] bg-[var(--chat-surface)] ${isClassic ? "rounded-[18px]" : "rounded-[20px]"} ${pending ? "opacity-70" : ""} ${failed ? "opacity-60" : ""}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt="Shared image"
        className="block h-auto w-full max-h-[min(480px,55vh)] object-contain"
      />
    </div>
  ) : (
    <div
      className={
        removed
          ? `border border-[#EDE5DF] bg-[var(--chat-hover)] text-[var(--chat-muted)] italic ${isClassic ? "rounded-[18px] px-[15px] py-[11px] text-[14.5px]" : "rounded-[20px] px-[17px] py-[13px] text-[15.5px]"}`
          : mine
            ? `bg-[var(--chat-coral)] text-white ${isClassic ? "rounded-[18px_18px_6px_18px] px-[15px] py-[11px] text-[14.5px]" : "rounded-[20px_20px_7px_20px] px-[17px] py-[13px] text-[15.5px]"} leading-relaxed whitespace-pre-wrap break-words ${pending ? "opacity-70" : ""} ${failed ? "opacity-60" : ""}`
            : `border border-[#EDE5DF] bg-[var(--chat-surface)] text-[var(--chat-text)] ${isClassic ? "rounded-[18px_18px_18px_6px] px-[15px] py-[11px] text-[14.5px]" : "rounded-[20px_20px_20px_7px] px-[17px] py-[13px] text-[15.5px]"} leading-relaxed whitespace-pre-wrap break-words ${pending ? "opacity-70" : ""} ${failed ? "opacity-60" : ""}`
      }
    >
      {displayBody}
    </div>
  );

  const meta = (
    <div className="flex items-center gap-2 px-1.5">
      <span className="text-[11.5px] text-[#B0A49B]">
        {pending
          ? "Sending…"
          : failed
            ? "Failed to send"
            : formatMessageTime(createdAt)}
      </span>
      {failed && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-[11.5px] font-medium text-[var(--chat-coral)] hover:underline"
        >
          Retry
        </button>
      )}
    </div>
  );

  if (mine) {
    return (
      <div
        className={`flex ${bubbleMaxWidth} flex-col items-end gap-1 self-end`}
      >
        {bubble}
        {!removed && meta}
      </div>
    );
  }

  if (isClassic && senderName && !removed) {
    return (
      <div className={`flex ${bubbleMaxWidth} items-end gap-2.5 self-start`}>
        <ChatAvatar name={senderName} size="sm" />
        <div className="min-w-0 flex flex-1 flex-col gap-1">
          {bubble}
          {meta}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex ${bubbleMaxWidthFallback} flex-col gap-1 ${mine ? "items-end self-end" : "self-start"}`}
    >
      {bubble}
      {!removed && meta}
    </div>
  );
}