const FALLBACK_STUN: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

export class MediaPermissionError extends Error {
  readonly code = "MEDIA_PERMISSION_DENIED" as const;

  constructor(message = "Microphone permission denied") {
    super(message);
    this.name = "MediaPermissionError";
  }
}

export async function fetchIceServers(): Promise<RTCIceServer[]> {
  try {
    const response = await fetch("/api/turn");
    if (!response.ok) throw new Error("turn fetch failed");
    const data = (await response.json()) as { iceServers?: RTCIceServer[] };
    if (data.iceServers?.length) return data.iceServers;
  } catch {
    // Fall back to public STUN when TURN is unavailable.
  }
  return FALLBACK_STUN;
}

export async function getLocalAudioStream(): Promise<MediaStream> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("getUserMedia is not available in this environment");
  }

  try {
    return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  } catch (error) {
    const name = error instanceof DOMException ? error.name : "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      throw new MediaPermissionError();
    }
    throw error;
  }
}