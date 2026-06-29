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

export async function clearConversationKey(
  vault: CallingAppVault,
  conversationId: string,
  ckGeneration: number,
): Promise<void> {
  await vault.crypto_material.delete(ckId(conversationId, ckGeneration));
}

export async function clearConversationKeys(
  vault: CallingAppVault,
  conversationId: string,
): Promise<void> {
  const rows = await vault.crypto_material
    .where("conversationId")
    .equals(conversationId)
    .toArray();
  if (rows.length > 0) {
    await vault.crypto_material.bulkDelete(rows.map((row) => row.id));
  }
}

function pubkeysEqual(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((byte, index) => byte === b[index]);
}

export async function ensureConversationKey(
  vault: CallingAppVault,
  supabase: SupabaseClient,
  conversationId: string,
  peerUserId: string,
  /** HKDF info generation — sender's key_generation for this message direction. */
  ckGeneration?: number,
): Promise<CryptoKey> {
  const peer = await fetchPeerCryptoKey(supabase, peerUserId);
  const identity = await vault.device_identity.get(DEVICE_IDENTITY_KEY);
  if (!identity) throw new Error("Device identity key is missing");

  const generation = ckGeneration ?? identity.keyGeneration;
  const cached = await loadConversationKey(vault, conversationId, generation);
  if (cached) return cached;

  const peerPubkey = parseBytea(peer.identity_pubkey);
  const pinned = await vault.trusted_pubkeys.get(peerUserId);
  if (
    pinned &&
    (pinned.keyGeneration !== peer.key_generation ||
      !pubkeysEqual(pinned.identityPubkey, peerPubkey))
  ) {
    await clearConversationKeys(vault, conversationId);
  }
  await vault.trusted_pubkeys.put({
    userId: peerUserId,
    identityPubkey: peerPubkey,
    keyGeneration: peer.key_generation,
    pinnedAt: new Date().toISOString(),
  });

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