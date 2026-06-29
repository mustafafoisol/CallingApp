export const DEVICE_ID_COOKIE = "callingapp_device_id";
export const SESSION_VERSION_COOKIE = "ca_sv";
export const SESSION_DEVICE_COOKIE = "ca_did";

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 400,
};

export function clearSessionCookies(
  setCookie: (name: string, value: string, options?: { maxAge: number }) => void,
): void {
  const expired = { maxAge: 0 };
  setCookie(SESSION_VERSION_COOKIE, "", expired);
  setCookie(SESSION_DEVICE_COOKIE, "", expired);
}