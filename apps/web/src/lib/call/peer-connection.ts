import { getLocalAudioStream } from "./media";

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

export function createPeerConnection(iceServers: RTCIceServer[]): RTCPeerConnection {
  const pc = new RTCPeerConnection({ iceServers, bundlePolicy: "max-bundle" });
  pc.addEventListener("iceconnectionstatechange", () => {
    if (process.env.NODE_ENV === "development") {
      console.log("[webrtc] iceConnectionState:", pc.iceConnectionState);
    }
  });
  return pc;
}

export async function attachLocalAudio(
  pc: RTCPeerConnection,
  stream?: MediaStream,
): Promise<MediaStream> {
  const local = stream ?? (await getLocalAudioStream());
  for (const track of local.getAudioTracks()) {
    pc.addTrack(track, local);
  }
  return local;
}

export function playRemoteAudio(pc: RTCPeerConnection): HTMLAudioElement {
  const audio = new Audio();
  audio.autoplay = true;
  pc.ontrack = (event) => {
    const [stream] = event.streams;
    if (!stream) return;
    audio.srcObject = stream;
    void audio.play().catch(() => undefined);
  };
  return audio;
}

export async function createOffer(pc: RTCPeerConnection): Promise<string> {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await waitForIceGathering(pc);
  const sdp = pc.localDescription?.sdp;
  if (!sdp) throw new Error("Failed to create call offer");
  return sdp;
}

export async function createAnswer(
  pc: RTCPeerConnection,
  remoteOffer: string,
): Promise<string> {
  await setRemoteDescription(pc, remoteOffer, "offer");
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  await waitForIceGathering(pc);
  const sdp = pc.localDescription?.sdp;
  if (!sdp) throw new Error("Failed to create call answer");
  return sdp;
}

export async function setRemoteDescription(
  pc: RTCPeerConnection,
  sdp: string,
  type: RTCSdpType,
): Promise<void> {
  await pc.setRemoteDescription({ type, sdp });
}

export function closePeerConnection(
  pc: RTCPeerConnection,
  resources?: { localStream?: MediaStream | null; remoteAudio?: HTMLAudioElement | null },
): void {
  resources?.localStream?.getTracks().forEach((track) => track.stop());
  if (resources?.remoteAudio) resources.remoteAudio.srcObject = null;
  pc.getSenders().forEach((sender) => sender.track?.stop());
  pc.ontrack = null;
  pc.close();
}