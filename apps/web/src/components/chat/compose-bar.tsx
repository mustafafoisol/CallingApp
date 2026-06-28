import { Image as ImageIcon, Paperclip, Send } from "lucide-react";

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
  return (
    <form
      onSubmit={onSubmit}
      className="shrink-0 px-5 pb-5 pt-3"
    >
      <div className="flex items-center gap-3 rounded-[28px] border border-[#EBE3DD] bg-[var(--chat-surface)] px-4 py-2 shadow-[0_2px_12px_rgba(60,40,30,0.05)]">
        <button
          type="button"
          className="flex h-9 w-9 shrink-0 items-center justify-center text-[#A8998F]"
          aria-label="Add attachment"
          disabled
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled || sending}
          className="min-w-0 flex-1 bg-transparent text-[15px] text-[var(--chat-text)] outline-none placeholder:text-[#A8998F]"
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
      </div>
    </form>
  );
}