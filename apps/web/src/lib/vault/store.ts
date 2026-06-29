import Dexie from "dexie";

import {
  CallingAppVault,
  DEVICE_IDENTITY_KEY,
  type ConversationRow,
  type DeviceIdentityRow,
  type TrustedPubkeyRow,
  type VaultMessageRow,
} from "./schema";

const vaultInstances = new Map<string, CallingAppVault>();
let activeVault: CallingAppVault | null = null;

function requireVault(): CallingAppVault {
  if (!activeVault) throw new Error("Vault is not open. Call openVault(userId) first.");
  return activeVault;
}

export async function openVault(userId: string): Promise<CallingAppVault> {
  let vault = vaultInstances.get(userId);
  if (!vault) {
    vault = new CallingAppVault(userId);
    vaultInstances.set(userId, vault);
  }
  await vault.open();
  activeVault = vault;
  return vault;
}

export function closeVault(): void {
  activeVault = null;
}

export async function storeIdentityKey(
  pair: Omit<DeviceIdentityRow, "id">,
): Promise<void> {
  await requireVault().device_identity.put({ id: DEVICE_IDENTITY_KEY, ...pair });
}

export async function getIdentityKey(): Promise<DeviceIdentityRow | undefined> {
  return requireVault().device_identity.get(DEVICE_IDENTITY_KEY);
}

function ckId(conversationId: string, gen: number): string {
  return `${conversationId}:${gen}`;
}

export async function storeConversationKey(
  conversationId: string,
  generation: number,
  ck: Uint8Array,
): Promise<void> {
  await requireVault().crypto_material.put({
    id: ckId(conversationId, generation),
    conversationId,
    peerKeyGeneration: generation,
    conversationKey: ck,
  });
}

export async function getConversationKey(
  conversationId: string,
  peerKeyGeneration: number,
): Promise<Uint8Array | undefined> {
  const row = await requireVault().crypto_material.get(
    ckId(conversationId, peerKeyGeneration),
  );
  return row?.conversationKey;
}

export async function insertMessage(msg: VaultMessageRow): Promise<void> {
  await requireVault().messages.put(msg);
}

export async function getMessages(
  conversationId: string,
  limit: number,
  beforeCreatedAt?: string,
): Promise<VaultMessageRow[]> {
  const collection = requireVault().messages.where("[conversationId+createdAt]");
  const query = beforeCreatedAt
    ? collection.between(
        [conversationId, ""],
        [conversationId, beforeCreatedAt],
        true,
        false,
      )
    : collection.between(
        [conversationId, Dexie.minKey],
        [conversationId, Dexie.maxKey],
      );
  return query.reverse().limit(limit).toArray();
}

export async function updateConversation(meta: ConversationRow): Promise<void> {
  await requireVault().conversations.put(meta);
}

export async function getConversations(): Promise<ConversationRow[]> {
  return requireVault().conversations.orderBy("previewAt").reverse().toArray();
}

export async function pinPeerPubkey(
  userId: string,
  pubkey: Uint8Array,
  generation: number,
): Promise<void> {
  await requireVault().trusted_pubkeys.put({
    userId,
    identityPubkey: pubkey,
    keyGeneration: generation,
    pinnedAt: new Date().toISOString(),
  });
}

export async function getPeerPubkey(userId: string): Promise<TrustedPubkeyRow> {
  const row = await requireVault().trusted_pubkeys.get(userId);
  if (!row) throw new Error(`No pinned pubkey for user ${userId}`);
  return row;
}