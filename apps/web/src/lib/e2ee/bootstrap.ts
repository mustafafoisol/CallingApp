import type { SupabaseClient } from "@supabase/supabase-js";
import {
  exportPrivateKeyRaw,
  exportPublicKeyRaw,
  generateIdentityKeyPair,
} from "@calling-app/core";

import type { CallingAppVault } from "@/lib/vault/schema";
import { DEVICE_IDENTITY_KEY } from "@/lib/vault/schema";
import { serializeBytea } from "./envelope";

export async function ensureDeviceIdentity(
  supabase: SupabaseClient,
  vault: CallingAppVault,
  userId: string,
) {
  const existing = await vault.device_identity.get(DEVICE_IDENTITY_KEY);
  if (existing) return existing;

  const pair = await generateIdentityKeyPair();
  const identityPublicKey = await exportPublicKeyRaw(pair.publicKey);
  const identityPrivateKey = await exportPrivateKeyRaw(pair.privateKey);
  const row = {
    id: DEVICE_IDENTITY_KEY,
    identityPrivateKey,
    identityPublicKey,
    keyGeneration: 1,
  };
  await vault.device_identity.put(row);

  const { error } = await supabase.from("user_crypto_keys").upsert({
    user_id: userId,
    identity_pubkey: serializeBytea(identityPublicKey),
    key_generation: 1,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;

  return row;
}