import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./media", () => ({
  fetchIceServers: vi.fn(async () => [{ urls: "stun:test" }]),
}));

vi.mock("./peer-connection", () => ({
  createPeerConnection: vi.fn(() => ({
    addEventListener: vi.fn(),
    connectionState: "connected",
  })),
  attachLocalAudio: vi.fn(async () => ({ getAudioTracks: () => [] })),
  playRemoteAudio: vi.fn(() => ({})),
  createOffer: vi.fn(async () => "offer-sdp"),
  createAnswer: vi.fn(async () => "answer-sdp"),
  setRemoteDescription: vi.fn(async () => undefined),
  closePeerConnection: vi.fn(),
}));

vi.mock("./signaling", () => ({
  writeOfferSdp: vi.fn(async () => ({})),
  writeAnswerSdp: vi.fn(async () => ({})),
  waitForAnswerSdp: vi.fn(async () => "answer-sdp"),
  waitForOfferSdp: vi.fn(async () => "offer-sdp"),
  endCall: vi.fn(async () => ({})),
}));

import { CallSession } from "./call-session";
import * as signaling from "./signaling";

describe("CallSession", () => {
  const supabase = {} as never;
  const userId = "user-1";
  const callId = "call-1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs caller flow", async () => {
    const onConnected = vi.fn();
    const session = new CallSession(supabase, userId, callId, { onConnected });

    await session.startAsCaller();

    expect(signaling.writeOfferSdp).toHaveBeenCalledWith(
      supabase,
      callId,
      userId,
      "offer-sdp",
    );
    expect(onConnected).toHaveBeenCalled();
  });

  it("runs callee flow", async () => {
    const session = new CallSession(supabase, userId, callId);
    await session.startAsCallee();
    expect(signaling.writeAnswerSdp).toHaveBeenCalledWith(
      supabase,
      callId,
      userId,
      "answer-sdp",
    );
  });

  it("hangUp is idempotent", async () => {
    const onEnded = vi.fn();
    const session = new CallSession(supabase, userId, callId, { onEnded });
    await session.hangUp();
    await session.hangUp();
    expect(signaling.endCall).toHaveBeenCalledOnce();
    expect(onEnded).toHaveBeenCalledOnce();
  });
});