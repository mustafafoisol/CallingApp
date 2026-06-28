function waitForIceGathering(pc: RTCPeerConnection, timeoutMs = 8000): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();

  return new Promise((resolve) => {
    const done = () => {
      pc.removeEventListener("icegatheringstatechange", onChange);
      clearTimeout(timer);
      resolve();
    };
    const onChange = () => {
      if (pc.iceGatheringState === "complete") done();
    };
    const timer = setTimeout(done, timeoutMs);
    pc.addEventListener("icegatheringstatechange", onChange);
  });
}

export class AudioPeerSession {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteAudio: HTMLAudioElement | null = null;
  private onConnectionChange?: (state: RTCPeerConnectionState) => void;

  constructor(onConnectionChange?: (state: RTCPeerConnectionState) => void) {
    this.onConnectionChange = onConnectionChange;
  }

  private attachPc(pc: RTCPeerConnection) {
    this.pc = pc;
    pc.onconnectionstatechange = () => {
      this.onConnectionChange?.(pc.connectionState);
    };
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (!stream) return;
      if (!this.remoteAudio) {
        this.remoteAudio = new Audio();
        this.remoteAudio.autoplay = true;
      }
      this.remoteAudio.srcObject = stream;
      void this.remoteAudio.play().catch(() => undefined);
    };
  }

  private async ensureLocalAudio(pc: RTCPeerConnection) {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => pc.addTrack(track, this.localStream!));
      return;
    }

    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
    this.localStream.getTracks().forEach((track) => pc.addTrack(track, this.localStream!));
  }

  async startCaller(iceServers: RTCIceServer[]): Promise<string> {
    const pc = new RTCPeerConnection({ iceServers });
    this.attachPc(pc);
    await this.ensureLocalAudio(pc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForIceGathering(pc);

    const sdp = pc.localDescription?.sdp;
    if (!sdp) throw new Error("Failed to create call offer.");
    return sdp;
  }

  async acceptCallee(iceServers: RTCIceServer[], offerSdp: string): Promise<string> {
    const pc = new RTCPeerConnection({ iceServers });
    this.attachPc(pc);
    await this.ensureLocalAudio(pc);
    await pc.setRemoteDescription({ type: "offer", sdp: offerSdp });

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await waitForIceGathering(pc);

    const sdp = pc.localDescription?.sdp;
    if (!sdp) throw new Error("Failed to create call answer.");
    return sdp;
  }

  async applyAnswer(answerSdp: string) {
    if (!this.pc) throw new Error("Peer connection not ready.");
    await this.pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
  }

  setMuted(muted: boolean) {
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }

  hangUp() {
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;
    if (this.remoteAudio) {
      this.remoteAudio.srcObject = null;
      this.remoteAudio = null;
    }
    if (this.pc) {
      this.pc.ontrack = null;
      this.pc.onconnectionstatechange = null;
      this.pc.close();
      this.pc = null;
    }
  }
}