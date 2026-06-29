import { describe, expect, it } from "vitest";
import {
  buildAad,
  decryptMessage,
  deriveConversationKey,
  deriveConversationKeyStatic,
  deriveSharedSecret,
  encryptMessage,
  generateIdentityKeyPair,
} from "./index.js";

const CONVERSATION_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const SENDER_ID = "11111111-2222-3333-4444-555555555555";
const MESSAGE_ID = "66666666-7777-8888-9999-aaaaaaaaaaaa";

function sampleAad(senderKeyGeneration: number) {
  return buildAad({
    conversationId: CONVERSATION_ID,
    senderId: SENDER_ID,
    messageId: MESSAGE_ID,
    type: "text",
    senderKeyGeneration,
  });
}

describe("crypto", () => {
  it("derives the same static conversation key for both parties", async () => {
    const alice = await generateIdentityKeyPair();
    const bob = await generateIdentityKeyPair();

    const aliceShared = await deriveSharedSecret(alice.privateKey, bob.publicKey);
    const bobShared = await deriveSharedSecret(bob.privateKey, alice.publicKey);
    expect(aliceShared).toEqual(bobShared);

    const aliceCk = await deriveConversationKeyStatic(aliceShared, CONVERSATION_ID);
    const bobCk = await deriveConversationKeyStatic(bobShared, CONVERSATION_ID);

    const plaintext = new TextEncoder().encode("hello static");
    const aad = sampleAad(1);
    const envelope = await encryptMessage(aliceCk, plaintext, aad);
    const decrypted = await decryptMessage(
      bobCk,
      envelope.ciphertext,
      envelope.nonce,
      aad,
    );

    expect(new TextDecoder().decode(decrypted)).toBe("hello static");
  });

  it("derives the same legacy conversation key for both parties", async () => {
    const alice = await generateIdentityKeyPair();
    const bob = await generateIdentityKeyPair();
    const peerKeyGeneration = 1;

    const aliceShared = await deriveSharedSecret(alice.privateKey, bob.publicKey);
    const bobShared = await deriveSharedSecret(bob.privateKey, alice.publicKey);
    expect(aliceShared).toEqual(bobShared);

    const aliceCk = await deriveConversationKey(
      aliceShared,
      CONVERSATION_ID,
      peerKeyGeneration,
    );
    const bobCk = await deriveConversationKey(
      bobShared,
      CONVERSATION_ID,
      peerKeyGeneration,
    );

    const plaintext = new TextEncoder().encode("hello from alice");
    const aad = sampleAad(peerKeyGeneration);
    const envelope = await encryptMessage(aliceCk, plaintext, aad);
    const decrypted = await decryptMessage(
      bobCk,
      envelope.ciphertext,
      envelope.nonce,
      aad,
    );

    expect(new TextDecoder().decode(decrypted)).toBe("hello from alice");
  });

  it("roundtrips encrypt and decrypt", async () => {
    const alice = await generateIdentityKeyPair();
    const bob = await generateIdentityKeyPair();
    const shared = await deriveSharedSecret(alice.privateKey, bob.publicKey);
    const ck = await deriveConversationKey(shared, CONVERSATION_ID, 2);
    const plaintext = new TextEncoder().encode("roundtrip test");
    const aad = sampleAad(2);

    const envelope = await encryptMessage(ck, plaintext, aad);
    const decrypted = await decryptMessage(
      ck,
      envelope.ciphertext,
      envelope.nonce,
      aad,
    );

    expect(decrypted).toEqual(plaintext);
  });

  it("derives an extractable conversation key for vault persistence", async () => {
    const pair = await generateIdentityKeyPair();
    const shared = await deriveSharedSecret(pair.privateKey, pair.publicKey);
    const ck = await deriveConversationKey(shared, CONVERSATION_ID, 1);

    const raw = await globalThis.crypto.subtle.exportKey("raw", ck);
    expect(new Uint8Array(raw)).toHaveLength(32);
  });

  it("rejects decrypt on auth tag failure", async () => {
    const pair = await generateIdentityKeyPair();
    const shared = await deriveSharedSecret(pair.privateKey, pair.publicKey);
    const ck = await deriveConversationKey(shared, CONVERSATION_ID, 1);
    const aad = sampleAad(1);
    const envelope = await encryptMessage(
      ck,
      new TextEncoder().encode("secret"),
      aad,
    );

    envelope.ciphertext[0] ^= 0xff;

    await expect(
      decryptMessage(ck, envelope.ciphertext, envelope.nonce, aad),
    ).rejects.toThrow(/authentication tag mismatch/);
  });
});