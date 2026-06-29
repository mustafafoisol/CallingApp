import type { SupabaseClient } from "@supabase/supabase-js";

import type { CallingAppVault } from "@/lib/vault/schema";
import { DEVICE_IDENTITY_KEY } from "@/lib/vault/schema";
import { type UserCryptoKeyRow } from "./envelope";
import {
  ensureConversationKey,
  invalidateConversationKey,
  prefetchPeerPublicKey,
} from "./key-exchange";

async function warmConversationKeys(
  supabase: SupabaseClient,
  vault: CallingAppVault,
  conversationId: string,
  peerUserId: string,
  peerGeneration?: number,
): Promise<void> {
  if (peerGeneration !== undefined) {
    await ensureConversationKey(
      vault,
      supabase,
      conversationId,
      peerUserId,
      peerGeneration,
    );
  } else {
    await ensureConversationKey(vault, supabase, conversationId, peerUserId);
  }

  const identity = await vault.device_identity.get(DEVICE_IDENTITY_KEY);
  if (identity) {
    await ensureConversationKey(
      vault,
      supabase,
      conversationId,
      peerUserId,
      identity.keyGeneration,
    );
  }
}

export async function exchangeKeysForConversation(
  supabase: SupabaseClient,
  vault: CallingAppVault,
  conversationId: string,
  peerUserId: string,
): Promise<void> {
  const available = await prefetchPeerPublicKey(vault, supabase, peerUserId);
  if (!available) {
    throw new Error("Friend has not published an encryption key yet.");
  }
  await warmConversationKeys(supabase, vault, conversationId, peerUserId);
}

export async function handlePeerKeyRotation(
  supabase: SupabaseClient,
  vault: CallingAppVault,
  conversationId: string,
  peerUserId: string,
  newGeneration: number,
): Promise<void> {
  const rows = await vault.crypto_material
    .where("conversationId")
    .equals(conversationId)
    .toArray();

  for (const row of rows) {
    await invalidateConversationKey(vault, conversationId, row.peerKeyGeneration);
  }

  await prefetchPeerPublicKey(vault, supabase, peerUserId);
  await warmConversationKeys(
    supabase,
    vault,
    conversationId,
    peerUserId,
    newGeneration,
  );
}

export function subscribeToPeerKeyChanges(
  supabase: SupabaseClient,
  peerUserId: string,
  onKeyChange: (row: UserCryptoKeyRow) => void,
): () => void {
  let channel: ReturnType<typeof supabase.channel> | null = null;
  let cancelled = false;

  async function subscribe() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (cancelled || !session) return;

    channel = supabase
      .channel(`peer-key:${peerUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_crypto_keys",
          filter: `user_id=eq.${peerUserId}`,
        },
        (payload) => onKeyChange(payload.new as UserCryptoKeyRow),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_crypto_keys",
          filter: `user_id=eq.${peerUserId}`,
        },
        (payload) => onKeyChange(payload.new as UserCryptoKeyRow),
      )
      .subscribe();
  }

  void subscribe();

  return () => {
    cancelled = true;
    if (channel) void supabase.removeChannel(channel);
  };
}