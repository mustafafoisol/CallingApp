const STORAGE_KEY = "callingapp:browserNotifications";

export function isBrowserNotificationsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const value = window.localStorage.getItem(STORAGE_KEY);
  if (value === null) return true;
  return value === "1";
}

export function setBrowserNotificationsEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
}