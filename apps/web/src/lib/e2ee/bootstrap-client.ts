import { ensureDeviceIdentity } from "@/lib/e2ee/bootstrap";
import { prefetchPeerPublicKey } from "@/lib/e2ee/key-exchange";
import { createClient } from "@/lib/supabase/client";
import { openVault } from "@/lib/vault/store";

export async function bootstrapE2eeForUser(userId: string): Promise<void> {
  const supabase = createClient();
  const vault = await openVault(userId);
  await ensureDeviceIdentity(supabase, vault, userId);
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