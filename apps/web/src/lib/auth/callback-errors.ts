export type AuthCallbackFailure =
  | "missing_code"
  | "exchange_failed"
  | "no_user"
  | "profile_bind"
  | "schema_outdated"
  | "code_reused"
  | "pkce_expired"
  | "expired"
  | "unknown";

export function authFailureFromExchangeError(message: string): AuthCallbackFailure {
  const msg = message.toLowerCase();

  if (msg.includes("already been used") || msg.includes("invalid grant")) {
    return "code_reused";
  }

  if (msg.includes("code verifier") || msg.includes("pkce")) {
    return "pkce_expired";
  }

  if (msg.includes("expired")) {
    return "expired";
  }

  return "exchange_failed";
}

export function authFailureMessage(detail?: string): string | null {
  switch (detail as AuthCallbackFailure | undefined) {
    case "code_reused":
      return "That sign-in link was already used. Click Continue with Google to start a fresh sign-in.";
    case "pkce_expired":
      return "Your sign-in session expired. Click Continue with Google to try again.";
    case "expired":
      return "The sign-in link expired. Click Continue with Google to try again.";
    case "profile_bind":
      return "We could not finish setting up your session. Please try signing in again.";
    case "schema_outdated":
      return "The database is missing required session columns. Apply the latest Supabase migrations, then sign in again.";
    case "missing_code":
    case "exchange_failed":
    case "no_user":
    case "unknown":
      return "Sign-in failed. Please try again.";
    default:
      return null;
  }
}