const subtle = globalThis.crypto.subtle;

export interface EncryptedAttachment {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  attachmentKey: Uint8Array;
}

async function importAttachmentKey(raw: Uint8Array): Promise<CryptoKey> {
  return subtle.importKey(
    "raw",
    raw as BufferSource,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

export async function encryptAttachmentBytes(
  plaintext: Uint8Array,
): Promise<EncryptedAttachment> {
  const attachmentKey = globalThis.crypto.getRandomValues(new Uint8Array(32));
  const key = await importAttachmentKey(attachmentKey);
  const nonce = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await subtle.encrypt(
    { name: "AES-GCM", iv: nonce as BufferSource },
    key,
    plaintext as BufferSource,
  );
  return {
    ciphertext: new Uint8Array(ciphertext),
    nonce,
    attachmentKey,
  };
}

export async function decryptAttachmentBytes(
  attachmentKey: Uint8Array,
  ciphertext: Uint8Array,
  nonce: Uint8Array,
): Promise<Uint8Array> {
  const key = await importAttachmentKey(attachmentKey);
  try {
    const plaintext = await subtle.decrypt(
      { name: "AES-GCM", iv: nonce as BufferSource },
      key,
      ciphertext as BufferSource,
    );
    return new Uint8Array(plaintext);
  } catch {
    throw new Error("Decryption failed: attachment authentication tag mismatch");
  }
}