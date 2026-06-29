export function LoginAlerts({
  error,
  reason,
}: {
  error?: string;
  reason?: string;
}) {
  if (!error && !reason) return null;

  const message =
    reason === "session_replaced"
      ? "You were signed out because this account was opened on another device."
      : error === "auth"
        ? "Sign-in failed. Please try again."
        : "Something went wrong. Please try again.";

  return (
    <p
      className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]"
      role="alert"
    >
      {message}
    </p>
  );
}