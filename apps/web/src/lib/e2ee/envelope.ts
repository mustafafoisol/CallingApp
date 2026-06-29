import type { EncryptedEnvelope, MessageType } from "@calling-app/core";

export type CryptoScheme = "static-v1" | "gen-v1";

export interface MessageCryptoMeta {
  scheme: CryptoScheme;
  senderKeyGeneration: number;
  senderPubkey: Uint8Array;
}

export interface MessageEnvelopeRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  type: MessageType;
  ciphertext: string;
  nonce: string;
  sender_key_generation: number;
  sender_pubkey: string | null;
  crypto_scheme: CryptoScheme;
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

export const X25519_PUBKEY_BYTES = 32;

function parseHexString(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    out[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return out;
}

export function parseBytea(value: string): Uint8Array {
  const trimmed = value.trim();
  if (trimmed.startsWith("\\x") || trimmed.startsWith("\\X")) {
    return parseHexString(trimmed.slice(2));
  }
  if (/^[0-9a-fA-F]+$/.test(trimmed) && trimmed.length % 2 === 0) {
    return parseHexString(trimmed);
  }
  const bin = atob(trimmed);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Parse a 32-byte X25519 public key from API/realtime bytea values. */
export function parseIdentityPubkey(value: unknown): Uint8Array | null {
  if (value == null) return null;

  if (value instanceof Uint8Array) {
    return value.length === X25519_PUBKEY_BYTES ? value : null;
  }

  if (Array.isArray(value)) {
    const bytes = new Uint8Array(value);
    return bytes.length === X25519_PUBKEY_BYTES ? bytes : null;
  }

  if (typeof value !== "string" || value.length === 0) return null;

  try {
    const bytes = parseBytea(value);
    return bytes.length === X25519_PUBKEY_BYTES ? bytes : null;
  } catch {
    return null;
  }
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

export const ENVELOPE_SELECT_LEGACY =
  "id, conversation_id, sender_id, recipient_id, type, ciphertext, nonce, sender_key_generation, attachment_id, created_at, expires_at";

export const ENVELOPE_SELECT_COLUMNS =
  `${ENVELOPE_SELECT_LEGACY}, sender_pubkey, crypto_scheme`;

export function isMissingCryptoMetaColumn(error: {
  message?: string;
} | null): boolean {
  const msg = error?.message?.toLowerCase() ?? "";
  return msg.includes("sender_pubkey") || msg.includes("crypto_scheme");
}

export function normalizeEnvelopeRow(
  row: Omit<MessageEnvelopeRow, "sender_pubkey" | "crypto_scheme"> & {
    sender_pubkey?: string | null;
    crypto_scheme?: CryptoScheme;
  },
): MessageEnvelopeRow {
  return {
    ...row,
    sender_pubkey: row.sender_pubkey ?? null,
    crypto_scheme: row.crypto_scheme ?? "gen-v1",
  };
}