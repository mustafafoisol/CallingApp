import type { SupabaseClient } from "@supabase/supabase-js";
import {
  exportPrivateKeyRaw,
  exportPublicKeyRaw,
  generateIdentityKeyPair,
} from "@calling-app/core";

import type { CallingAppVault } from "@/lib/vault/schema";
import { DEVICE_IDENTITY_KEY, type DeviceIdentityRow } from "@/lib/vault/schema";
import { serializeBytea } from "./envelope";

async function publishIdentityToServer(
  supabase: SupabaseClient,
  userId: string,
  identity: DeviceIdentityRow,
): Promise<void> {
  const { error } = await supabase.from("user_crypto_keys").upsert({
    user_id: userId,
    identity_pubkey: serializeBytea(identity.identityPublicKey),
    key_generation: identity.keyGeneration,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

async function nextKeyGeneration(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("user_crypto_keys")
    .select("key_generation")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data?.key_generation ?? 0) + 1;
}

export async function ensureDeviceIdentity(
  supabase: SupabaseClient,
  vault: CallingAppVault,
  userId: string,
) {
  const existing = await vault.device_identity.get(DEVICE_IDENTITY_KEY);
  if (existing) {
    await publishIdentityToServer(supabase, userId, existing);
    return existing;
  }

  const pair = await generateIdentityKeyPair();
  const identityPublicKey = await exportPublicKeyRaw(pair.publicKey);
  const identityPrivateKey = await exportPrivateKeyRaw(pair.privateKey);
  const keyGeneration = await nextKeyGeneration(supabase, userId);
  const row = {
    id: DEVICE_IDENTITY_KEY,
    identityPrivateKey,
    identityPublicKey,
    keyGeneration,
  };
  await vault.device_identity.put(row);
  await publishIdentityToServer(supabase, userId, row);

  return row;
}