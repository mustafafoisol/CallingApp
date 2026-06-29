import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchIceServers, getLocalAudioStream, MediaPermissionError } from "./media";
import {
  attachLocalAudio,
  closePeerConnection,
  createOffer,
  createPeerConnection,
  setRemoteDescription,
} from "./peer-connection";

class MockMediaStream {
  private tracks = [{ kind: "audio", stop: vi.fn(), enabled: true }];

  getAudioTracks() {
    return this.tracks;
  }

  getTracks() {
    return this.tracks;
  }
}

function createMockPc() {
  const senders: Array<{ track: { stop: vi.Mock } | null }> = [];
  let iceGatheringState: RTCIceGatheringState = "complete";
  const listeners = new Map<string, Set<() => void>>();

  const pc = {
    iceGatheringState,
    localDescription: { sdp: "local-sdp", type: "offer" as RTCSdpType },
    ontrack: null as RTCPeerConnection["ontrack"],
    createOffer: vi.fn(async () => ({ type: "offer", sdp: "offer-sdp" })),
    createAnswer: vi.fn(async () => ({ type: "answer", sdp: "answer-sdp" })),
    setLocalDescription: vi.fn(async (desc?: RTCSessionDescriptionInit) => {
      if (desc?.sdp) pc.localDescription = { sdp: desc.sdp, type: desc.type ?? "offer" };
    }),
    setRemoteDescription: vi.fn(async () => undefined),
    addTrack: vi.fn(),
    addEventListener: vi.fn((event: string, cb: () => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(cb);
    }),
    removeEventListener: vi.fn((event: string, cb: () => void) => {
      listeners.get(event)?.delete(cb);
    }),
    getSenders: vi.fn(() => senders),
    close: vi.fn(),
    set iceGatheringStateValue(state: RTCIceGatheringState) {
      iceGatheringState = state;
      (pc as { iceGatheringState: RTCIceGatheringState }).iceGatheringState = state;
      listeners.get("icegatheringstatechange")?.forEach((cb) => cb());
    },
  };

  return { pc: pc as unknown as RTCPeerConnection, senders };
}

describe("call media", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("fetchIceServers returns servers from /api/turn", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          iceServers: [{ urls: "turn:example.com" }],
        }),
      })),
    );

    const servers = await fetchIceServers();
    expect(servers).toEqual([{ urls: "turn:example.com" }]);
  });

  it("fetchIceServers falls back to public STUN", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false })));

    const servers = await fetchIceServers();
    expect(servers).toEqual([{ urls: "stun:stun.l.google.com:19302" }]);
  });

  it("getLocalAudioStream throws MediaPermissionError when denied", async () => {
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn(async () => {
          throw new DOMException("denied", "NotAllowedError");
        }),
      },
    });

    await expect(getLocalAudioStream()).rejects.toBeInstanceOf(MediaPermissionError);
  });
});

describe("peer connection", () => {
  const RealRTCPeerConnection = globalThis.RTCPeerConnection;

  beforeEach(() => {
    class StubPeerConnection {
      iceServers: RTCIceServer[];
      bundlePolicy: RTCBundlePolicy;

      constructor(config?: RTCConfiguration) {
        this.iceServers = config?.iceServers ?? [];
        this.bundlePolicy = config?.bundlePolicy ?? "balanced";
      }

      addEventListener() {}
      removeEventListener() {}
    }

    vi.stubGlobal("RTCPeerConnection", StubPeerConnection as typeof RTCPeerConnection);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (RealRTCPeerConnection) {
      globalThis.RTCPeerConnection = RealRTCPeerConnection;
    }
  });

  it("createPeerConnection uses max-bundle", () => {
    const pc = createPeerConnection([{ urls: "stun:stun.l.google.com:19302" }]);
    expect((pc as unknown as { bundlePolicy: string }).bundlePolicy).toBe("max-bundle");
  });

  it("attachLocalAudio adds local tracks", async () => {
    const { pc } = createMockPc();
    const stream = new MockMediaStream() as unknown as MediaStream;

    const attached = await attachLocalAudio(pc, stream);

    expect(attached).toBe(stream);
    expect(pc.addTrack).toHaveBeenCalledOnce();
  });

  it("createOffer returns full local SDP after gathering", async () => {
    const { pc } = createMockPc();

    const sdp = await createOffer(pc);
    expect(sdp).toBe("offer-sdp");
    expect(pc.setLocalDescription).toHaveBeenCalled();
  });

  it("setRemoteDescription applies remote SDP", async () => {
    const { pc } = createMockPc();
    await setRemoteDescription(pc, "remote-offer", "offer");
    expect(pc.setRemoteDescription).toHaveBeenCalledWith({
      type: "offer",
      sdp: "remote-offer",
    });
  });

  it("closePeerConnection stops tracks and closes pc", () => {
    const { pc } = createMockPc();
    const track = { stop: vi.fn() };
    const stream = {
      getTracks: () => [track],
    } as unknown as MediaStream;
    const remoteAudio = { srcObject: {} as MediaStream | null } as HTMLAudioElement;

    closePeerConnection(pc, { localStream: stream, remoteAudio });

    expect(track.stop).toHaveBeenCalled();
    expect(remoteAudio.srcObject).toBeNull();
    expect(pc.close).toHaveBeenCalled();
  });
});