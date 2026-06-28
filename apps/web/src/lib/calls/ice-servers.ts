import { GOOGLE_STUN_SERVERS, mergeIceServers } from "@calling-app/core";

export async function fetchIceServers(): Promise<RTCIceServer[]> {
  try {
    const response = await fetch("/api/turn");
    if (!response.ok) throw new Error("turn fetch failed");
    const data = (await response.json()) as { iceServers?: RTCIceServer[] };
    if (data.iceServers?.length) return data.iceServers;
  } catch {
    // Fall back to public STUN when TURN is unavailable.
  }

  return mergeIceServers(GOOGLE_STUN_SERVERS) as RTCIceServer[];
}