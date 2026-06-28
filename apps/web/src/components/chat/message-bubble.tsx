import { formatMessageTime } from "@/lib/chat/format-time";

export function MessageBubble({
  body,
  mine,
  createdAt,
}: {
  body: string;
  mine: boolean;
  createdAt: string;
}) {
  return (
    <div
      className={`flex max-w-[78%] flex-col gap-1 ${mine ? "items-end self-end" : "items-start self-start"}`}
    >
      <div
        className={
          mine
            ? "rounded-[20px_20px_7px_20px] bg-[var(--chat-coral)] px-[17px] py-[13px] text-[15.5px] leading-relaxed whitespace-pre-wrap break-words text-white"
            : "rounded-[20px_20px_20px_7px] border border-[#EDE5DF] bg-[var(--chat-surface)] px-[17px] py-[13px] text-[15.5px] leading-relaxed whitespace-pre-wrap break-words text-[var(--chat-text)]"
        }
      >
        {body}
      </div>
      <span className="px-1.5 text-[11.5px] text-[#B0A49B]">
        {formatMessageTime(createdAt)}
      </span>
    </div>
  );
}