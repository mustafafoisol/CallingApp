import { isMessageSoundEnabled } from "./message-sound-prefs";

export function shouldPlayMessageSound({
  senderId,
  currentUserId,
  isActive,
  soundEnabled = isMessageSoundEnabled(),
}: {
  senderId: string;
  currentUserId: string;
  isActive: boolean;
  soundEnabled?: boolean;
}): boolean {
  if (senderId === currentUserId) return false;
  if (isActive) return false;
  return soundEnabled;
}