import type { SupabaseClient } from "@supabase/supabase-js";
import {
  deriveConversationKeyLegacy,
  deriveConversationKeyStatic,
  deriveSharedSecret,
  importPrivateKeyRaw,
  importPublicKeyRaw,
} from "@calling-app/core";

import type { CallingAppVault } from "@/lib/vault/schema";
import { DEVICE_IDENTITY_KEY } from "@/lib/vault/schema";
import {
  parseIdentityPubkey,
  type CryptoScheme,
  type UserCryptoKeyRow,
} from "./envelope";

export async function tryFetchPeerCryptoKey(
  supabase: SupabaseClient,
  peerUserId: string,
): Promise<UserCryptoKeyRow | null> {
  const { data, error } = await supabase
    .from("user_crypto_keys")
    .select("user_id, identity_pubkey, key_generation, updated_at")
    .eq("user_id", peerUserId)
    .maybeSingle();
  if (error) throw error;
  return (data as UserCryptoKeyRow | null) ?? null;
}

export async function fetchPeerCryptoKey(
  supabase: SupabaseClient,
  peerUserId: string,
): Promise<UserCryptoKeyRow> {
  const peer = await tryFetchPeerCryptoKey(supabase, peerUserId);
  if (!peer) throw new Error(`Peer ${peerUserId} has no published crypto key`);
  return peer;
}

export async function prefetchPeerPublicKey(
  vault: CallingAppVault,
  supabase: SupabaseClient,
  peerUserId: string,
): Promise<boolean> {
  const peer = await tryFetchPeerCryptoKey(supabase, peerUserId);
  if (!peer) return false;

  const peerPubkey = parseIdentityPubkey(peer.identity_pubkey);
  if (!peerPubkey) return false;
  const pinned = await vault.trusted_pubkeys.get(peerUserId);
  if (
    !pinned ||
    pinned.keyGeneration !== peer.key_generation ||
    pinned.identityPubkey.length !== peerPubkey.length ||
    !pinned.identityPubkey.every((byte, index) => byte === peerPubkey[index])
  ) {
    await vault.trusted_pubkeys.put({
      userId: peerUserId,
      identityPubkey: peerPubkey,
      keyGeneration: peer.key_generation,
      pinnedAt: new Date().toISOString(),
    });
  }

  return true;
}

export async function deriveCkForMessage(
  vault: CallingAppVault,
  conversationId: string,
  peerPubkey: Uint8Array,
  scheme: CryptoScheme,
  senderKeyGeneration: number,
): Promise<CryptoKey> {
  const identity = await vault.device_identity.get(DEVICE_IDENTITY_KEY);
  if (!identity) throw new Error("Device identity key is missing");

  const myPrivate = await importPrivateKeyRaw(identity.identityPrivateKey);
  const peerPublic = await importPublicKeyRaw(peerPubkey);
  const shared = await deriveSharedSecret(myPrivate, peerPublic);

  if (scheme === "static-v1") {
    return deriveConversationKeyStatic(shared, conversationId);
  }
  return deriveConversationKeyLegacy(
    shared,
    conversationId,
    senderKeyGeneration,
  );
}