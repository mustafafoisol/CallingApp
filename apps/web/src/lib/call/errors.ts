export function formatCallStartError(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String((error as { message: unknown }).message)
        : "Could not start call.";

  const lower = message.toLowerCase();

  if (lower.includes("calls") && lower.includes("does not exist")) {
    return "Voice calling is not set up on the server. Apply the calls database migration in Supabase.";
  }

  if (lower.includes("row-level security") || lower.includes("policy")) {
    return "Cannot call this user. Make sure you are accepted friends.";
  }

  if (lower.includes("media_permission_denied") || lower.includes("notallowederror")) {
    return "Microphone permission denied.";
  }

  return message;
}