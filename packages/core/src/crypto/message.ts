import type { EncryptedEnvelope, MessageAadParams } from "./types.js";

const subtle = globalThis.crypto.subtle;
const textEncoder = new TextEncoder();

function normalizeUuid(value: string): string {
  return value.toLowerCase();
}

export function buildAad(params: MessageAadParams): Uint8Array {
  const parts = [
    normalizeUuid(params.conversationId),
    normalizeUuid(params.senderId),
    normalizeUuid(params.messageId),
    params.type,
    String(params.senderKeyGeneration),
  ];
  return textEncoder.encode(parts.join("||"));
}

export async function encryptMessage(
  conversationKey: CryptoKey,
  plaintext: Uint8Array,
  aad: Uint8Array,
): Promise<EncryptedEnvelope> {
  const nonce = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await subtle.encrypt(
    {
      name: "AES-GCM",
      iv: nonce as BufferSource,
      additionalData: aad as BufferSource,
    },
    conversationKey,
    plaintext as BufferSource,
  );
  return {
    ciphertext: new Uint8Array(ciphertext),
    nonce,
  };
}

export async function decryptMessage(
  conversationKey: CryptoKey,
  ciphertext: Uint8Array,
  nonce: Uint8Array,
  aad: Uint8Array,
): Promise<Uint8Array> {
  try {
    const plaintext = await subtle.decrypt(
      {
        name: "AES-GCM",
        iv: nonce as BufferSource,
        additionalData: aad as BufferSource,
      },
      conversationKey,
      ciphertext as BufferSource,
    );
    return new Uint8Array(plaintext);
  } catch {
    throw new Error("Decryption failed: authentication tag mismatch");
  }
}