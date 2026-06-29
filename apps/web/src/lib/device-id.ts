export const DEVICE_ID_STORAGE_KEY = "callingapp:device_id";

export function getOrCreateDeviceId(): string {
  const existing = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const deviceId = crypto.randomUUID();
  setDeviceId(deviceId);
  return deviceId;
}

export function setDeviceId(deviceId: string): void {
  window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
}