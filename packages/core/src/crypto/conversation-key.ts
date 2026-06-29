const subtle = globalThis.crypto.subtle;
const CK_INFO_PREFIX = "callingapp-ck-v1-";
const textEncoder = new TextEncoder();

export async function deriveSharedSecret(
  myPrivateKey: CryptoKey,
  peerPublicKey: CryptoKey,
): Promise<Uint8Array> {
  const bits = await subtle.deriveBits(
    { name: "X25519", public: peerPublicKey },
    myPrivateKey,
    256,
  );
  return new Uint8Array(bits);
}

export async function deriveConversationKey(
  sharedSecret: Uint8Array,
  conversationId: string,
  peerKeyGeneration: number,
): Promise<CryptoKey> {
  const baseKey = await subtle.importKey(
    "raw",
    sharedSecret as BufferSource,
    "HKDF",
    false,
    ["deriveKey"],
  );

  return subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: textEncoder.encode(conversationId),
      info: textEncoder.encode(`${CK_INFO_PREFIX}${peerKeyGeneration}`),
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}