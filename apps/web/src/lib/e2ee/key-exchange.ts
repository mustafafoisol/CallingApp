import type { SupabaseClient } from "@supabase/supabase-js";
import {
  deriveConversationKey,
  deriveSharedSecret,
  importPrivateKeyRaw,
  importPublicKeyRaw,
} from "@calling-app/core";

import type { CallingAppVault } from "@/lib/vault/schema";
import { DEVICE_IDENTITY_KEY } from "@/lib/vault/schema";
import { parseBytea, type UserCryptoKeyRow } from "./envelope";

const subtle = globalThis.crypto.subtle;

function ckId(conversationId: string, generation: number): string {
  return `${conversationId}:${generation}`;
}

async function importAesKey(raw: Uint8Array): Promise<CryptoKey> {
  return subtle.importKey(
    "raw",
    raw as BufferSource,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function exportAesKey(key: CryptoKey): Promise<Uint8Array> {
  return new Uint8Array(await subtle.exportKey("raw", key));
}

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

async function fetchPeerCryptoKey(
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

  const peerPubkey = parseBytea(peer.identity_pubkey);
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

export async function loadConversationKey(
  vault: CallingAppVault,
  conversationId: string,
  peerKeyGeneration: number,
): Promise<CryptoKey | undefined> {
  const row = await vault.crypto_material.get(ckId(conversationId, peerKeyGeneration));
  return row ? importAesKey(row.conversationKey) : undefined;
}

export async function ensureConversationKey(
  vault: CallingAppVault,
  supabase: SupabaseClient,
  conversationId: string,
  peerUserId: string,
  peerKeyGeneration?: number,
): Promise<CryptoKey> {
  const peer = await fetchPeerCryptoKey(supabase, peerUserId);
  const generation = peerKeyGeneration ?? peer.key_generation;
  const cached = await loadConversationKey(vault, conversationId, generation);
  if (cached) return cached;

  if (peer.key_generation !== generation) {
    throw new Error(`Peer pubkey unavailable for key generation ${generation}`);
  }

  const peerPubkey = parseBytea(peer.identity_pubkey);
  const pinned = await vault.trusted_pubkeys.get(peerUserId);
  if (!pinned) {
    await vault.trusted_pubkeys.put({
      userId: peerUserId,
      identityPubkey: peerPubkey,
      keyGeneration: generation,
      pinnedAt: new Date().toISOString(),
    });
  }

  const identity = await vault.device_identity.get(DEVICE_IDENTITY_KEY);
  if (!identity) throw new Error("Device identity key is missing");

  const myPrivate = await importPrivateKeyRaw(identity.identityPrivateKey);
  const peerPublic = await importPublicKeyRaw(peerPubkey);
  const shared = await deriveSharedSecret(myPrivate, peerPublic);
  const ck = await deriveConversationKey(shared, conversationId, generation);
  await vault.crypto_material.put({
    id: ckId(conversationId, generation),
    conversationId,
    peerKeyGeneration: generation,
    conversationKey: await exportAesKey(ck),
  });
  return ck;
}