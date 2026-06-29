import type { EncryptedEnvelope, MessageType } from "@calling-app/core";

export interface MessageEnvelopeRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  type: MessageType;
  ciphertext: unknown;
  nonce: unknown;
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

function looksLikeHex(value: string): boolean {
  return value.length > 0 && value.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(value);
}

function parseHexString(hex: string): Uint8Array | null {
  if (hex.length % 2 !== 0) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.slice(i, i + 2), 16);
    if (Number.isNaN(byte)) return null;
    out[i / 2] = byte;
  }
  return out;
}

function parseHexBytea(value: string): Uint8Array | null {
  if (value.startsWith("\\x")) return parseHexString(value.slice(2));
  if (value.startsWith("0x")) return parseHexString(value.slice(2));
  if (looksLikeHex(value)) return parseHexString(value);
  return null;
}

export function parseBytea(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) return value;
  if (Array.isArray(value)) return new Uint8Array(value);
  if (typeof value === "object" && value !== null && "type" in value && (value as { type: string }).type === "Buffer" && "data" in value) {
    return new Uint8Array((value as { data: number[] }).data);
  }
  if (typeof value !== "string") {
    throw new Error(`Unsupported bytea format: ${typeof value}`);
  }

  const hex = parseHexBytea(value);
  if (hex) return hex;

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

function normalizeUuid(value: unknown): string {
  return String(value).toLowerCase();
}

export function normalizeEnvelopeRow(row: Record<string, unknown>): MessageEnvelopeRow {
  const senderKeyGeneration = Number(row.sender_key_generation);
  if (!Number.isFinite(senderKeyGeneration)) {
    throw new Error("Envelope missing sender_key_generation");
  }

  const type = row.type;
  if (type !== "text" && type !== "image") {
    throw new Error(`Envelope has invalid type: ${String(type)}`);
  }

  return {
    id: normalizeUuid(row.id),
    conversation_id: normalizeUuid(row.conversation_id),
    sender_id: normalizeUuid(row.sender_id),
    recipient_id: normalizeUuid(row.recipient_id),
    type,
    ciphertext: row.ciphertext,
    nonce: row.nonce,
    sender_key_generation: senderKeyGeneration,
    attachment_id: (row.attachment_id as string | null) ?? null,
    created_at: String(row.created_at),
    expires_at: String(row.expires_at),
  };
}