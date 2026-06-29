import type { SupabaseClient } from "@supabase/supabase-js";

import type { CallingAppVault } from "@/lib/vault/schema";
import { type UserCryptoKeyRow } from "./envelope";
import {
  ensureConversationKey,
  invalidateConversationKey,
  prefetchPeerPublicKey,
} from "./key-exchange";

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
  await ensureConversationKey(vault, supabase, conversationId, peerUserId);
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
    if (row.peerKeyGeneration < newGeneration) {
      await invalidateConversationKey(vault, conversationId, row.peerKeyGeneration);
    }
  }

  await prefetchPeerPublicKey(vault, supabase, peerUserId);
  await ensureConversationKey(
    vault,
    supabase,
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