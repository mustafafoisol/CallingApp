import type { SupabaseClient } from "@supabase/supabase-js";

import { ensureDeviceIdentity } from "@/lib/e2ee/bootstrap";
import { prefetchPeerPublicKey } from "@/lib/e2ee/key-exchange";
import { createClient } from "@/lib/supabase/client";
import type { CallingAppVault } from "@/lib/vault/schema";
import { openVault } from "@/lib/vault/store";

async function loadAcceptedFriendIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (error) throw error;

  const friendIds = new Set<string>();
  for (const row of data ?? []) {
    const peerId =
      row.requester_id === userId ? row.addressee_id : row.requester_id;
    friendIds.add(peerId);
  }
  return [...friendIds];
}

export async function prefetchFriendsCryptoKeys(
  supabase: SupabaseClient,
  vault: CallingAppVault,
  userId: string,
): Promise<void> {
  const friendIds = await loadAcceptedFriendIds(supabase, userId);
  await Promise.all(
    friendIds.map(async (friendId) => {
      try {
        await prefetchPeerPublicKey(vault, supabase, friendId);
      } catch (error) {
        console.error("[e2ee] prefetch friend key failed", friendId, error);
      }
    }),
  );
}

export async function bootstrapE2eeForUser(userId: string): Promise<void> {
  const supabase = createClient();
  const vault = await openVault(userId);
  await ensureDeviceIdentity(supabase, vault, userId);
  await prefetchFriendsCryptoKeys(supabase, vault, userId);
}

export async function bootstrapAndPrefetchPeer(
  userId: string,
  peerUserId: string,
): Promise<boolean> {
  const supabase = createClient();
  const vault = await openVault(userId);
  await ensureDeviceIdentity(supabase, vault, userId);
  return prefetchPeerPublicKey(vault, supabase, peerUserId);
}