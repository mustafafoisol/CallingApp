import type { EncryptedEnvelope, MessageType } from "@calling-app/core";

export interface MessageEnvelopeRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  type: MessageType;
  ciphertext: string;
  nonce: string;
  sender_key_generation: number;
  attachment_id: string | null;
  created_at: string;
  expires_at: string;
}

export interface UserCryptoKeyRow {
  user_id: string;
  identity_pubkey: string;
  key_generation: number;
  updated_at: string;
}

export function parseBytea(value: string): Uint8Array {
  if (value.startsWith("\\x")) {
    const hex = value.slice(2);
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      out[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    return out;
  }
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function serializeBytea(bytes: Uint8Array): string {
  return `\\x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export function toEncryptedEnvelope(
  row: Pick<MessageEnvelopeRow, "ciphertext" | "nonce">,
): EncryptedEnvelope {
  return {
    ciphertext: parseBytea(row.ciphertext),
    nonce: parseBytea(row.nonce),
  };
}