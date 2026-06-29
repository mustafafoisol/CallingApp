"use client";

import { Phone, PhoneOff } from "lucide-react";
import { ChatAvatar } from "@/components/chat/avatar";

export function IncomingCallBanner({
  remoteName,
  remoteAvatarUrl,
  onAccept,
  onDecline,
}: {
  remoteName: string;
  remoteAvatarUrl?: string | null;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="fixed inset-x-4 top-4 z-50 mx-auto max-w-md rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-surface)] p-4 shadow-xl">
      <div className="flex items-center gap-3">
        <ChatAvatar name={remoteName} imageUrl={remoteAvatarUrl} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-[var(--chat-text)]">{remoteName}</p>
          <p className="text-sm text-[var(--chat-muted)]">Incoming voice call</p>
        </div>
        <button
          type="button"
          onClick={onDecline}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--danger)] text-white"
          aria-label="Decline call"
        >
          <PhoneOff className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onAccept}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent)] text-white"
          aria-label="Accept call"
        >
          <Phone className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}