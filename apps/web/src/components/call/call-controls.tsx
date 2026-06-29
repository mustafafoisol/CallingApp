"use client";

import { Mic, MicOff, PhoneOff } from "lucide-react";

export function CallControls({
  muted,
  inCall,
  onToggleMute,
  onHangUp,
}: {
  muted: boolean;
  inCall: boolean;
  onToggleMute: () => void;
  onHangUp: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      {inCall && (
        <button
          type="button"
          onClick={onToggleMute}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--chat-hover)] text-[var(--chat-text)]"
          aria-label={muted ? "Unmute microphone" : "Mute microphone"}
        >
          {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>
      )}
      <button
        type="button"
        onClick={onHangUp}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--danger)] text-white transition-opacity hover:opacity-90"
        aria-label="End call"
      >
        <PhoneOff className="h-6 w-6" />
      </button>
    </div>
  );
}