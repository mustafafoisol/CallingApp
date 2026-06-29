import type { SupabaseClient } from "@supabase/supabase-js";

import type { CallingAppVault } from "@/lib/vault/schema";
import { prefetchPeerPublicKey } from "./key-exchange";

const PEER_KEY_RETRY_MS = 1500;
const PEER_KEY_MAX_ATTEMPTS = 4;

export async function ensurePeerKeyAvailable(
  supabase: SupabaseClient,
  vault: CallingAppVault,
  peerUserId: string,
): Promise<void> {
  for (let attempt = 0; attempt < PEER_KEY_MAX_ATTEMPTS; attempt += 1) {
    const available = await prefetchPeerPublicKey(vault, supabase, peerUserId);
    if (available) return;
    if (attempt < PEER_KEY_MAX_ATTEMPTS - 1) {
      await new Promise((resolve) => setTimeout(resolve, PEER_KEY_RETRY_MS));
    }
  }
  throw new Error(
    "Friend has not published an encryption key yet. Ask them to open the app and wait a few seconds.",
  );
}