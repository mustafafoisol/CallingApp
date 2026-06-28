import { formatMessageTime } from "@/lib/chat/format-time";
import { extractUrls } from "@/lib/chat/detect-links";
import { REMOVED_MESSAGE_LABEL } from "@/lib/chat/messages";
import type { MessageStatus } from "@/lib/chat/optimistic";
import { LinkPreviewCard } from "./link-preview-card";

export function MessageBubble({
  body,
  mine,
  createdAt,
  status = "confirmed",
  onRetry,
  variant = "classic",
  removed,
  imageUrl,
  onLinkOpen,
  actionsOpen,
}: {
  body: string;
  mine: boolean;
  createdAt: string;
  status?: MessageStatus;
  onRetry?: () => void;
  variant?: "classic" | "focused";
  removed?: boolean;
  imageUrl?: string | null;
  onLinkOpen?: (url: string) => void;
  actionsOpen?: boolean;
}) {
  const pending = status === "pending";
  const failed = status === "failed";
  const isClassic = variant === "classic";
  const displayBody = removed ? REMOVED_MESSAGE_LABEL : body;
  const isImage = !removed && !!imageUrl;
  const links = !removed && !isImage ? extractUrls(body) : [];

  const removedBubbleClass = mine
    ? `border border-[#EDE5DF] bg-[var(--chat-hover)] text-[var(--chat-muted)] italic ${isClassic ? "rounded-[18px_18px_6px_18px] px-[15px] py-[11px] text-[14.5px]" : "rounded-[20px_20px_7px_20px] px-[17px] py-[13px] text-[15.5px]"}`
    : `border border-[#EDE5DF] bg-[var(--chat-hover)] text-[var(--chat-muted)] italic ${isClassic ? "rounded-[18px_18px_18px_6px] px-[15px] py-[11px] text-[14.5px]" : "rounded-[20px_20px_20px_7px] px-[17px] py-[13px] text-[15.5px]"}`;

  const selectionRing =
    actionsOpen && mine && !removed
      ? "shadow-[0_0_0_3px_rgba(242,107,82,0.22)]"
      : actionsOpen && !mine && !removed
        ? "shadow-[0_0_0_3px_rgba(237,229,223,0.9)]"
        : "";

  const bubble = isImage ? (
    <div
      className={`overflow-hidden border border-[#EDE5DF] bg-[var(--chat-surface)] ${isClassic ? "rounded-[18px]" : "rounded-[20px]"} ${selectionRing} ${pending ? "opacity-70" : ""} ${failed ? "opacity-60" : ""}`}
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
          ? removedBubbleClass
          : mine
            ? `bg-[var(--chat-coral)] text-white ${isClassic ? "rounded-[18px_18px_6px_18px] px-[15px] py-[11px] text-[14.5px]" : "rounded-[20px_20px_7px_20px] px-[17px] py-[13px] text-[15.5px]"} leading-relaxed whitespace-pre-wrap break-words ${selectionRing} ${pending ? "opacity-70" : ""} ${failed ? "opacity-60" : ""}`
            : `border border-[#EDE5DF] bg-[var(--chat-surface)] text-[var(--chat-text)] ${isClassic ? "rounded-[18px_18px_18px_6px] px-[15px] py-[11px] text-[14.5px]" : "rounded-[20px_20px_20px_7px] px-[17px] py-[13px] text-[15.5px]"} leading-relaxed whitespace-pre-wrap break-words ${selectionRing} ${pending ? "opacity-70" : ""} ${failed ? "opacity-60" : ""}`
      }
    >
      {displayBody}
    </div>
  );

  return (
    <div
      className={`flex min-w-0 flex-col gap-2 ${mine ? "items-end" : "items-start"}`}
    >
      {bubble}
      {onLinkOpen &&
        links.map((url) => (
          <LinkPreviewCard
            key={url}
            url={url}
            mine={mine}
            onOpen={onLinkOpen}
          />
        ))}
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