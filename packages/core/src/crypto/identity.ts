import type { IdentityKeyPair } from "./types.js";

const subtle = globalThis.crypto.subtle;

export async function generateIdentityKeyPair(): Promise<IdentityKeyPair> {
  const keyPair = await subtle.generateKey(
    { name: "X25519" },
    true,
    ["deriveBits"],
  );
  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  };
}

export async function exportPublicKeyRaw(publicKey: CryptoKey): Promise<Uint8Array> {
  const raw = await subtle.exportKey("raw", publicKey);
  return new Uint8Array(raw);
}

export async function importPublicKeyRaw(raw: Uint8Array): Promise<CryptoKey> {
  return subtle.importKey("raw", raw, { name: "X25519" }, true, []);
}

export async function exportPrivateKeyRaw(privateKey: CryptoKey): Promise<Uint8Array> {
  const raw = await subtle.exportKey("pkcs8", privateKey);
  return new Uint8Array(raw);
}

export async function importPrivateKeyRaw(raw: Uint8Array): Promise<CryptoKey> {
  return subtle.importKey(
    "pkcs8",
    raw,
    { name: "X25519" },
    true,
    ["deriveBits"],
  );
}