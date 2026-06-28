"use client";

import { Mic, MicOff, Phone, PhoneOff, PhoneIncoming } from "lucide-react";
import { ChatAvatar } from "@/components/chat/avatar";
import { useCall } from "@/contexts/call-context";

export function CallOverlay() {
  const {
    uiState,
    remoteName,
    muted,
    error,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
  } = useCall();

  if (uiState === "idle" || uiState === "ended") return null;

  const inCall = uiState === "connected";
  const incoming = uiState === "incoming";
  const outgoing = uiState === "outgoing" || uiState === "connecting";

  let statusLabel = "On call";
  if (incoming) statusLabel = "Incoming audio call";
  else if (uiState === "connecting") statusLabel = "Connecting…";
  else if (outgoing) statusLabel = "Calling…";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl border border-[var(--chat-border)] bg-[var(--chat-surface)] p-6 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--chat-active)] text-[var(--chat-coral)]">
            {incoming ? (
              <PhoneIncoming className="h-7 w-7" />
            ) : (
              <Phone className="h-7 w-7" />
            )}
          </div>
          <ChatAvatar name={remoteName} size="lg" />
          <h2 className="mt-4 text-xl font-bold text-[var(--chat-text)]">
            {remoteName}
          </h2>
          <p className="mt-1 text-sm text-[var(--chat-muted)]">{statusLabel}</p>
          {error && (
            <p className="mt-3 text-sm text-[var(--danger)]" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="mt-8 flex items-center justify-center gap-3">
          {incoming ? (
            <>
              <button
                type="button"
                onClick={() => void rejectCall()}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--danger)] text-white transition-opacity hover:opacity-90"
                aria-label="Decline call"
              >
                <PhoneOff className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => void acceptCall()}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)] text-white transition-opacity hover:opacity-90"
                aria-label="Accept call"
              >
                <Phone className="h-6 w-6" />
              </button>
            </>
          ) : (
            <>
              {inCall && (
                <button
                  type="button"
                  onClick={toggleMute}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--chat-hover)] text-[var(--chat-text)]"
                  aria-label={muted ? "Unmute microphone" : "Mute microphone"}
                >
                  {muted ? (
                    <MicOff className="h-5 w-5" />
                  ) : (
                    <Mic className="h-5 w-5" />
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => void endCall()}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--danger)] text-white transition-opacity hover:opacity-90"
                aria-label="End call"
              >
                <PhoneOff className="h-6 w-6" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}