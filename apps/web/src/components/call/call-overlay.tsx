"use client";

import { useEffect, useState } from "react";
import { Phone, PhoneIncoming } from "lucide-react";
import { ChatAvatar } from "@/components/chat/avatar";
import { useCall } from "@/contexts/call-context";
import { CallControls } from "./call-controls";

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function CallOverlay() {
  const {
    uiState,
    remoteName,
    remoteAvatarUrl,
    muted,
    error,
    statusMessage,
    connectedAt,
    endCall,
    toggleMute,
  } = useCall();
  const [elapsed, setElapsed] = useState("0:00");

  useEffect(() => {
    if (uiState !== "connected" || !connectedAt) return;
    const tick = () => setElapsed(formatElapsed(Date.now() - connectedAt));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [connectedAt, uiState]);

  useEffect(() => {
    if (uiState !== "connected") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") void endCall();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [endCall, uiState]);

  if (uiState === "idle" || uiState === "incoming") return null;

  const inCall = uiState === "connected";
  const outgoing = uiState === "outgoing" || uiState === "connecting";

  let statusLabel = statusMessage ?? "On call";
  if (uiState === "connecting") statusLabel = "Connecting…";
  else if (outgoing) statusLabel = "Calling…";
  else if (inCall) statusLabel = `Connected · ${elapsed}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-sm rounded-3xl border border-[var(--chat-border)] bg-[var(--chat-surface)] p-6 shadow-2xl"
        aria-live="polite"
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--chat-active)] text-[var(--chat-coral)]">
            {outgoing ? (
              <Phone className="h-7 w-7" />
            ) : (
              <PhoneIncoming className="h-7 w-7" />
            )}
          </div>
          <ChatAvatar name={remoteName} imageUrl={remoteAvatarUrl} size="lg" />
          <h2 className="mt-4 text-xl font-bold text-[var(--chat-text)]">{remoteName}</h2>
          <p className="mt-1 text-sm text-[var(--chat-muted)]">{statusLabel}</p>
          {error && (
            <p className="mt-3 text-sm text-[var(--danger)]" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="mt-8">
          <CallControls
            muted={muted}
            inCall={inCall}
            onToggleMute={toggleMute}
            onHangUp={() => void endCall()}
          />
        </div>
      </div>
    </div>
  );
}