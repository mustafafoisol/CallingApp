"use client";

import { useEffect, useRef } from "react";
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react";

export function EmojiPickerPopover({
  open,
  onClose,
  onEmojiSelect,
  anchorRef,
}: {
  open: boolean;
  onClose: () => void;
  onEmojiSelect: (emoji: string) => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (anchorRef?.current?.contains(target)) return;
      onClose();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  function handleEmojiClick(emojiData: EmojiClickData) {
    onEmojiSelect(emojiData.emoji);
  }

  return (
    <div
      ref={popoverRef}
      className="absolute bottom-full left-0 z-20 mb-2 max-h-[40vh] overflow-hidden rounded-2xl border border-[#EBE3DD] bg-[var(--chat-surface)] shadow-[0_4px_24px_rgba(60,40,30,0.12)]"
      role="dialog"
      aria-label="Emoji picker"
    >
      <EmojiPicker
        onEmojiClick={handleEmojiClick}
        width="min(320px, calc(100vw - 2.5rem))"
        height="min(360px, 40vh)"
        previewConfig={{ showPreview: false }}
        skinTonesDisabled
        searchDisabled={false}
        lazyLoadEmojis
      />
    </div>
  );
}