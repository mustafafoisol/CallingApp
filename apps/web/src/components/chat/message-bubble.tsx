import { formatMessageTime } from "@/lib/chat/format-time";
import type { MessageStatus } from "@/lib/chat/optimistic";

export function MessageBubble({
  body,
  mine,
  createdAt,
  status = "confirmed",
  onRetry,
}: {
  body: string;
  mine: boolean;
  createdAt: string;
  status?: MessageStatus;
  onRetry?: () => void;
}) {
  const pending = status === "pending";
  const failed = status === "failed";

  return (
    <div
      className={`flex max-w-[78%] flex-col gap-1 ${mine ? "items-end self-end" : "items-start self-start"}`}
    >
      <div
        className={
          mine
            ? `rounded-[20px_20px_7px_20px] bg-[var(--chat-coral)] px-[17px] py-[13px] text-[15.5px] leading-relaxed whitespace-pre-wrap break-words text-white ${pending ? "opacity-70" : ""} ${failed ? "opacity-60" : ""}`
            : `rounded-[20px_20px_20px_7px] border border-[#EDE5DF] bg-[var(--chat-surface)] px-[17px] py-[13px] text-[15.5px] leading-relaxed whitespace-pre-wrap break-words text-[var(--chat-text)] ${pending ? "opacity-70" : ""} ${failed ? "opacity-60" : ""}`
        }
      >
        {body}
      </div>
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
    </div>
  );
}