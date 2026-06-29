import type { SupabaseClient } from "@supabase/supabase-js";

import { wipeVault } from "@/lib/vault";

import { DEVICE_ID_STORAGE_KEY } from "../device-id";

const trackedObjectUrls = new Set<string>();

export function trackObjectUrl(url: string): string {
  trackedObjectUrls.add(url);
  return url;
}

function revokeObjectUrls(): void {
  for (const url of trackedObjectUrls) {
    URL.revokeObjectURL(url);
  }
  trackedObjectUrls.clear();
}

export async function purgeLocalData(userId: string): Promise<void> {
  await wipeVault(userId);

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

  revokeObjectUrls();
}

export async function handleSessionReplaced(
  userId: string,
  supabase: SupabaseClient,
  router: { push: (href: string) => void; refresh: () => void },
): Promise<void> {
  await purgeLocalData(userId);
  await supabase.auth.signOut();
  router.push("/login?reason=session_replaced");
  router.refresh();
}