"use client";

import { useRef, useState } from "react";
import { Image as ImageIcon, Paperclip, Send, Smile } from "lucide-react";
import { EmojiPickerPopover } from "@/components/chat/emoji-picker-popover";

export function ComposeBar({
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled,
  sending,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  placeholder: string;
  disabled?: boolean;
  sending?: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const composeRef = useRef<HTMLDivElement>(null);

  function insertEmojiAtCursor(emoji: string) {
    const input = inputRef.current;
    if (!input) {
      onChange(value + emoji);
      return;
    }

    const start = input.selectionStart ?? value.length;
    const end = input.selectionEnd ?? value.length;
    const next = value.slice(0, start) + emoji + value.slice(end);
    onChange(next);

    const cursor = start + emoji.length;
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(cursor, cursor);
    });
  }

  function handleEmojiSelect(emoji: string) {
    insertEmojiAtCursor(emoji);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="relative shrink-0 px-5 pb-5 pt-3"
    >
      <div
        ref={composeRef}
        className="relative flex items-center gap-3 rounded-[28px] border border-[#EBE3DD] bg-[var(--chat-surface)] px-4 py-2 shadow-[0_2px_12px_rgba(60,40,30,0.05)]"
      >
        <button
          type="button"
          className="flex h-9 w-9 shrink-0 items-center justify-center text-[#A8998F]"
          aria-label="Add attachment"
          disabled
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <button
          type="button"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
            pickerOpen
              ? "bg-[var(--chat-active)] text-[var(--chat-coral)]"
              : "text-[#A8998F] hover:bg-[var(--chat-hover)]"
          }`}
          aria-label="Insert emoji"
          aria-expanded={pickerOpen}
          disabled={disabled || sending}
          onClick={() => setPickerOpen((open) => !open)}
        >
          <Smile className="h-5 w-5" aria-hidden />
        </button>
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder={placeholder}
          disabled={disabled || sending}
          rows={1}
          className="min-h-[24px] min-w-0 flex-1 resize-none bg-transparent text-[15px] leading-normal text-[var(--chat-text)] outline-none placeholder:text-[#A8998F]"
        />
        <button
          type="button"
          className="flex h-9 w-9 shrink-0 items-center justify-center text-[#A8998F] opacity-50"
          aria-label="Send image"
          disabled
        >
          <ImageIcon className="h-5 w-5" aria-hidden />
        </button>
        <button
          type="submit"
          disabled={disabled || sending || !value.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--chat-coral)] text-white shadow-[0_2px_10px_rgba(242,107,82,0.35)] disabled:opacity-50"
          aria-label="Send message"
        >
          <Send className="h-[18px] w-[18px]" />
        </button>

        <EmojiPickerPopover
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onEmojiSelect={handleEmojiSelect}
          anchorRef={composeRef}
        />
      </div>
    </form>
  );
}