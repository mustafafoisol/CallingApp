import { MessageCircle } from "lucide-react";

export function ChatEmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-[var(--chat-bg)] px-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--chat-hover)] text-[var(--chat-muted)]">
        <MessageCircle className="h-7 w-7" />
      </div>
      <div>
        <p className="text-base font-semibold text-[var(--chat-text)]">
          Select a conversation
        </p>
        <p className="mt-1 text-sm text-[var(--chat-muted)]">
          Choose a contact from the sidebar to start chatting.
        </p>
      </div>
    </div>
  );
}