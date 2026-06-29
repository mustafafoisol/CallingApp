/** Set NEXT_PUBLIC_ENABLE_VOICE_CALLS=true to enable voice calling. */
export function isVoiceCallsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_VOICE_CALLS === "true";
}