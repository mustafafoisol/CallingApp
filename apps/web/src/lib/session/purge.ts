import { DEVICE_ID_STORAGE_KEY } from "../device-id";

/**
 * Wipes the IndexedDB vault. Wired to `wipeVault()` when the vault API lands (Task 02).
 */
async function wipeVault(): Promise<void> {
  // TODO(Task 02): import { wipeVault } from "@/lib/vault" and call here
}

export async function purgeLocalData(): Promise<void> {
  await wipeVault();

  const keysToRemove: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key?.startsWith("callingapp:") && key !== DEVICE_ID_STORAGE_KEY) {
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) {
    window.localStorage.removeItem(key);
  }
}