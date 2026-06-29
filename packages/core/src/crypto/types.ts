import type { MessageType } from "../types.js";

export interface IdentityKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface EncryptedEnvelope {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
}

export interface PeerKey {
  userId: string;
  publicKey: Uint8Array;
  keyGeneration: number;
}

export interface PeerKeyProvider {
  getPeerPublicKeys(userId: string): Promise<PeerKey[]>;
}

export interface ConversationKeyMaterial {
  conversationId: string;
  peerKeyGeneration: number;
  key: CryptoKey;
}

export interface MessageAadParams {
  conversationId: string;
  senderId: string;
  messageId: string;
  type: MessageType;
  senderKeyGeneration: number;
}