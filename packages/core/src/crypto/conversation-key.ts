const subtle = globalThis.crypto.subtle;
const CK_INFO_STATIC = "callingapp-ck-v1";
const CK_INFO_LEGACY_PREFIX = "callingapp-ck-v1-";
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

async function importHkdfBaseKey(sharedSecret: Uint8Array): Promise<CryptoKey> {
  return subtle.importKey(
    "raw",
    sharedSecret as BufferSource,
    "HKDF",
    false,
    ["deriveKey"],
  );
}

async function deriveAesKey(
  baseKey: CryptoKey,
  conversationId: string,
  info: string,
): Promise<CryptoKey> {
  return subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: textEncoder.encode(conversationId),
      info: textEncoder.encode(info),
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

export async function deriveConversationKeyStatic(
  sharedSecret: Uint8Array,
  conversationId: string,
): Promise<CryptoKey> {
  const baseKey = await importHkdfBaseKey(sharedSecret);
  return deriveAesKey(baseKey, conversationId, CK_INFO_STATIC);
}

export async function deriveConversationKeyLegacy(
  sharedSecret: Uint8Array,
  conversationId: string,
  senderKeyGeneration: number,
): Promise<CryptoKey> {
  const baseKey = await importHkdfBaseKey(sharedSecret);
  return deriveAesKey(
    baseKey,
    conversationId,
    `${CK_INFO_LEGACY_PREFIX}${senderKeyGeneration}`,
  );
}

/** @deprecated Use deriveConversationKeyLegacy or deriveConversationKeyStatic */
export async function deriveConversationKey(
  sharedSecret: Uint8Array,
  conversationId: string,
  peerKeyGeneration: number,
): Promise<CryptoKey> {
  return deriveConversationKeyLegacy(
    sharedSecret,
    conversationId,
    peerKeyGeneration,
  );
}