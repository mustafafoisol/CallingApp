const SOUND_URL = "/sounds/new-message.wav";
const DEBOUNCE_MS = 250;

let audio: HTMLAudioElement | null = null;
let primed = false;
let lastPlayedAt = 0;

function getAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!audio) {
    audio = new Audio(SOUND_URL);
    audio.volume = 0.4;
    audio.preload = "auto";
  }
  return audio;
}

export function primeMessageSound(): void {
  const clip = getAudio();
  if (!clip || primed) return;

  primed = true;
  clip.muted = true;
  void clip.play().then(() => {
    clip.pause();
    clip.currentTime = 0;
    clip.muted = false;
  }).catch(() => {
    primed = false;
  });
}

export function playMessageSound(): void {
  const clip = getAudio();
  if (!clip) return;

  const now = Date.now();
  if (now - lastPlayedAt < DEBOUNCE_MS) return;
  lastPlayedAt = now;

  clip.currentTime = 0;
  void clip.play().catch(() => {
    // Browsers block autoplay until the user interacts with the page.
  });
}