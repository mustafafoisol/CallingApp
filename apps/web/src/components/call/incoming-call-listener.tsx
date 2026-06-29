"use client";

import { useCall } from "@/contexts/call-context";
import { IncomingCallBanner } from "./incoming-call-banner";

export function IncomingCallListener() {
  const { uiState, remoteName, remoteAvatarUrl, acceptCall, rejectCall } = useCall();

  if (uiState !== "incoming") return null;

  return (
    <IncomingCallBanner
      remoteName={remoteName}
      remoteAvatarUrl={remoteAvatarUrl}
      onAccept={() => void acceptCall()}
      onDecline={() => void rejectCall()}
    />
  );
}