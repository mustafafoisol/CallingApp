import Dexie, { type EntityTable } from "dexie";

import type { MessageType } from "@calling-app/core";

export const DEVICE_IDENTITY_KEY = "local" as const;

export function vaultDbName(userId: string): string {
  return `callingapp-vault-${userId}`;
}

export interface DeviceIdentityRow {
  id: typeof DEVICE_IDENTITY_KEY;
  identityPrivateKey: Uint8Array;
  identityPublicKey: Uint8Array;
  keyGeneration: number;
}

export interface CryptoMaterialRow {
  id: string;
  conversationId: string;
  peerKeyGeneration: number;
  conversationKey: Uint8Array;
}

export interface TrustedPubkeyRow {
  userId: string;
  identityPubkey: Uint8Array;
  keyGeneration: number;
  pinnedAt: string;
}

export interface VaultMessageRow {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  type: MessageType;
  attachmentId: string | null;
  createdAt: string;
  removedAt: string | null;
}

export interface ConversationRow {
  id: string;
  preview: string;
  previewAt: string | null;
  unreadCount: number;
  lastReadAt: string | null;
}

export interface OutboxRow {
  clientId: string;
  conversationId: string;
  recipientId: string;
  type: MessageType;
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  senderKeyGeneration: number;
  attachmentId: string | null;
  createdAt: string;
}

export interface AttachmentCacheRow {
  attachmentId: string;
  conversationId: string;
  blob: Blob;
  cachedAt: number;
}

export interface MessageHideRow {
  messageId: string;
  conversationId: string;
  hiddenAt: string;
}

export class CallingAppVault extends Dexie {
  device_identity!: EntityTable<DeviceIdentityRow, "id">;
  crypto_material!: EntityTable<CryptoMaterialRow, "id">;
  trusted_pubkeys!: EntityTable<TrustedPubkeyRow, "userId">;
  messages!: EntityTable<VaultMessageRow, "id">;
  conversations!: EntityTable<ConversationRow, "id">;
  outbox!: EntityTable<OutboxRow, "clientId">;
  attachments_cache!: EntityTable<AttachmentCacheRow, "attachmentId">;
  message_hides!: EntityTable<MessageHideRow, "messageId">;

  constructor(userId: string) {
    super(vaultDbName(userId));
    this.version(1).stores({
      device_identity: "id",
      crypto_material:
        "id, conversationId, peerKeyGeneration, [conversationId+peerKeyGeneration]",
      trusted_pubkeys: "userId, keyGeneration",
      messages:
        "id, conversationId, createdAt, [conversationId+createdAt], [conversationId+id]",
      conversations: "id, previewAt",
      outbox: "clientId, conversationId",
      attachments_cache: "attachmentId, conversationId, cachedAt",
      message_hides: "messageId, conversationId",
    });
  }
}