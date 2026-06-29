export const DEVICE_ID_STORAGE_KEY = "callingapp:device_id";

export function getOrCreateDeviceId(): string {
  const existing = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const deviceId = crypto.randomUUID();
  window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
  return deviceId;
}