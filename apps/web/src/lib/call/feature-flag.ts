/** Voice calling is on by default; set NEXT_PUBLIC_ENABLE_VOICE_CALLS=false to disable. */
export function isVoiceCallsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_VOICE_CALLS !== "false";
}