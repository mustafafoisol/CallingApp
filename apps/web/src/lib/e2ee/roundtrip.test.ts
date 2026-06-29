import "fake-indexeddb/auto";

import {
  buildAad,
  decryptMessage,
  encryptMessage,
  exportPrivateKeyRaw,
  exportPublicKeyRaw,
  generateIdentityKeyPair,
} from "@calling-app/core";
import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DEVICE_IDENTITY_KEY } from "@/lib/vault/schema";
import { closeVault, openVault } from "@/lib/vault/store";
import { wipeVault } from "@/lib/vault/wipe";
import { deriveCkForMessage } from "./key-exchange";

const CONVERSATION_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const ALICE_ID = "11111111-1111-1111-1111-111111111111";
const BOB_ID = "22222222-2222-2222-2222-222222222222";

describe("e2ee static conversation key", () => {
  let alicePair: Awaited<ReturnType<typeof generateIdentityKeyPair>>;
  let bobPair: Awaited<ReturnType<typeof generateIdentityKeyPair>>;
  let alicePub: Uint8Array;
  let bobPub: Uint8Array;

  beforeEach(async () => {
    alicePair = await generateIdentityKeyPair();
    bobPair = await generateIdentityKeyPair();
    alicePub = await exportPublicKeyRaw(alicePair.publicKey);
    bobPub = await exportPublicKeyRaw(bobPair.publicKey);
    await wipeVault(ALICE_ID);
    await wipeVault(BOB_ID);
  });

  afterEach(async () => {
    closeVault();
    await Dexie.delete(`callingapp-vault-${ALICE_ID}`);
    await Dexie.delete(`callingapp-vault-${BOB_ID}`);
  });

  async function seedIdentity(
    userId: string,
    pair: Awaited<ReturnType<typeof generateIdentityKeyPair>>,
    publicKey: Uint8Array,
    keyGeneration: number,
  ) {
    const vault = await openVault(userId);
    await vault.device_identity.put({
      id: DEVICE_IDENTITY_KEY,
      identityPrivateKey: await exportPrivateKeyRaw(pair.privateKey),
      identityPublicKey: publicKey,
      keyGeneration,
    });
    return vault;
  }

  it("derives the same static key for both directions", async () => {
    const aliceVault = await seedIdentity(ALICE_ID, alicePair, alicePub, 1);
    const bobVault = await seedIdentity(BOB_ID, bobPair, bobPub, 3);

    const aliceToBob = await deriveCkForMessage(
      aliceVault,
      CONVERSATION_ID,
      bobPub,
      "static-v1",
      1,
    );
    const bobFromAlice = await deriveCkForMessage(
      bobVault,
      CONVERSATION_ID,
      alicePub,
      "static-v1",
      1,
    );
    const bobToAlice = await deriveCkForMessage(
      bobVault,
      CONVERSATION_ID,
      alicePub,
      "static-v1",
      3,
    );
    const aliceFromBob = await deriveCkForMessage(
      aliceVault,
      CONVERSATION_ID,
      bobPub,
      "static-v1",
      3,
    );

    const aliceToBobRaw = new Uint8Array(
      await globalThis.crypto.subtle.exportKey("raw", aliceToBob),
    );
    const bobFromAliceRaw = new Uint8Array(
      await globalThis.crypto.subtle.exportKey("raw", bobFromAlice),
    );
    const bobToAliceRaw = new Uint8Array(
      await globalThis.crypto.subtle.exportKey("raw", bobToAlice),
    );
    const aliceFromBobRaw = new Uint8Array(
      await globalThis.crypto.subtle.exportKey("raw", aliceFromBob),
    );

    expect(aliceToBobRaw).toEqual(bobFromAliceRaw);
    expect(bobToAliceRaw).toEqual(aliceFromBobRaw);
  });

  it("decrypts using envelope pubkey snapshot after server pubkey changes", async () => {
    const aliceVault = await seedIdentity(ALICE_ID, alicePair, alicePub, 1);
    const bobVault = await seedIdentity(BOB_ID, bobPair, bobPub, 2);

    const senderCk = await deriveCkForMessage(
      bobVault,
      CONVERSATION_ID,
      alicePub,
      "static-v1",
      2,
    );
    const receiverCk = await deriveCkForMessage(
      aliceVault,
      CONVERSATION_ID,
      bobPub,
      "static-v1",
      2,
    );

    const aad = buildAad({
      conversationId: CONVERSATION_ID,
      senderId: BOB_ID,
      messageId: "msg-snapshot",
      type: "text",
      senderKeyGeneration: 2,
    });
    const envelope = await encryptMessage(
      senderCk,
      new TextEncoder().encode("hello alice"),
      aad,
    );
    const plaintext = await decryptMessage(
      receiverCk,
      envelope.ciphertext,
      envelope.nonce,
      aad,
    );
    expect(new TextDecoder().decode(plaintext)).toBe("hello alice");

    const snapshotCk = await deriveCkForMessage(
      aliceVault,
      CONVERSATION_ID,
      bobPub,
      "static-v1",
      2,
    );
    const snapshotPlain = await decryptMessage(
      snapshotCk,
      envelope.ciphertext,
      envelope.nonce,
      aad,
    );
    expect(new TextDecoder().decode(snapshotPlain)).toBe("hello alice");
  });
});