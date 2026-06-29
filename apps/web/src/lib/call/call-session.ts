import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchIceServers } from "./media";
import {
  attachLocalAudio,
  closePeerConnection,
  createAnswer,
  createOffer,
  createPeerConnection,
  playRemoteAudio,
  setRemoteDescription,
} from "./peer-connection";
import {
  endCall,
  waitForAnswerSdp,
  waitForOfferSdp,
  writeAnswerSdp,
  writeOfferSdp,
} from "./signaling";

export type CallSessionEvents = {
  onConnected?: () => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
  onStateChange?: (state: RTCPeerConnectionState) => void;
};

export class CallSession {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteAudio: HTMLAudioElement | null = null;
  private ended = false;
  private muted = false;

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly userId: string,
    private readonly callId: string,
    private readonly events: CallSessionEvents = {},
  ) {}

  async startAsCaller(): Promise<void> {
    await this.setupPeer();
    const offer = await createOffer(this.pc!);
    await writeOfferSdp(this.supabase, this.callId, this.userId, offer);
    const answer = await waitForAnswerSdp(this.supabase, this.callId);
    await setRemoteDescription(this.pc!, answer, "answer");
    this.events.onConnected?.();
  }

  async startAsCallee(): Promise<void> {
    const offer = await waitForOfferSdp(this.supabase, this.callId);
    await this.setupPeer();
    const answer = await createAnswer(this.pc!, offer);
    await writeAnswerSdp(this.supabase, this.callId, this.userId, answer);
    this.events.onConnected?.();
  }

  async hangUp(): Promise<void> {
    if (this.ended) return;
    this.ended = true;
    try {
      await endCall(this.supabase, this.callId, this.userId);
    } catch {
      // Idempotent when the row is already terminal.
    }
    this.cleanup();
    this.events.onEnded?.();
  }

  mute(): void {
    this.muted = true;
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = false;
    });
  }

  unmute(): void {
    this.muted = false;
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = true;
    });
  }

  isMuted(): boolean {
    return this.muted;
  }

  private async setupPeer(): Promise<void> {
    const iceServers = await fetchIceServers();
    this.pc = createPeerConnection(iceServers);
    this.remoteAudio = playRemoteAudio(this.pc);
    this.pc.addEventListener("connectionstatechange", () => {
      if (!this.pc) return;
      this.events.onStateChange?.(this.pc.connectionState);
      if (this.pc.connectionState === "connected") this.events.onConnected?.();
    });
    this.localStream = await attachLocalAudio(this.pc);
  }

  private cleanup(): void {
    if (this.pc) {
      closePeerConnection(this.pc, {
        localStream: this.localStream,
        remoteAudio: this.remoteAudio,
      });
    }
    this.pc = null;
    this.localStream = null;
    this.remoteAudio = null;
  }
}