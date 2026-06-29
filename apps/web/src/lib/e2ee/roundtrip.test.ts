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
import { serializeBytea } from "./envelope";
import { ensureConversationKey } from "./key-exchange";

const CONVERSATION_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const ALICE_ID = "11111111-1111-1111-1111-111111111111";
const BOB_ID = "22222222-2222-2222-2222-222222222222";

function makeSupabase(keys: Record<string, { generation: number; publicKey: Uint8Array }>) {
  return {
    from: (table: string) => {
      if (table !== "user_crypto_keys") throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: (_col: string, userId: string) => ({
            maybeSingle: async () => {
              const row = keys[userId];
              if (!row) return { data: null, error: null };
              return {
                data: {
                  user_id: userId,
                  identity_pubkey: serializeBytea(row.publicKey),
                  key_generation: row.generation,
                  updated_at: "2026-06-29T00:00:00Z",
                },
                error: null,
              };
            },
          }),
        }),
      };
    },
  };
}

describe("e2ee happy path", () => {
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

  it("send and receive derive the same key when both users are on generation 1", async () => {
    const supabase = makeSupabase({
      [ALICE_ID]: { generation: 1, publicKey: alicePub },
      [BOB_ID]: { generation: 1, publicKey: bobPub },
    });

    const aliceVault = await seedIdentity(ALICE_ID, alicePair, alicePub, 1);
    const bobVault = await seedIdentity(BOB_ID, bobPair, bobPub, 1);

    const senderCk = await ensureConversationKey(
      aliceVault,
      supabase as never,
      CONVERSATION_ID,
      BOB_ID,
      1,
    );
    const receiverCk = await ensureConversationKey(
      bobVault,
      supabase as never,
      CONVERSATION_ID,
      ALICE_ID,
      1,
    );

    const senderRaw = new Uint8Array(
      await globalThis.crypto.subtle.exportKey("raw", senderCk),
    );
    const receiverRaw = new Uint8Array(
      await globalThis.crypto.subtle.exportKey("raw", receiverCk),
    );
    expect(senderRaw).toEqual(receiverRaw);

    const messageId = "msg-happy-1";
    const aad = buildAad({
      conversationId: CONVERSATION_ID,
      senderId: ALICE_ID,
      messageId,
      type: "text",
      senderKeyGeneration: 1,
    });
    const envelope = await encryptMessage(
      senderCk,
      new TextEncoder().encode("hello bob"),
      aad,
    );
    const plaintext = await decryptMessage(
      receiverCk,
      envelope.ciphertext,
      envelope.nonce,
      aad,
    );
    expect(new TextDecoder().decode(plaintext)).toBe("hello bob");
  });

  it("still decrypts after peer re-login bumps generation to 2", async () => {
    const bobPubGen2 = bobPub;
    const supabase = makeSupabase({
      [ALICE_ID]: { generation: 1, publicKey: alicePub },
      [BOB_ID]: { generation: 2, publicKey: bobPubGen2 },
    });

    const aliceVault = await seedIdentity(ALICE_ID, alicePair, alicePub, 1);
    const bobVault = await seedIdentity(BOB_ID, bobPair, bobPubGen2, 2);

    const senderCk = await ensureConversationKey(
      bobVault,
      supabase as never,
      CONVERSATION_ID,
      ALICE_ID,
      2,
    );
    const receiverCk = await ensureConversationKey(
      aliceVault,
      supabase as never,
      CONVERSATION_ID,
      BOB_ID,
      2,
    );

    const aad = buildAad({
      conversationId: CONVERSATION_ID,
      senderId: BOB_ID,
      messageId: "msg-after-relogin",
      type: "text",
      senderKeyGeneration: 2,
    });
    const envelope = await encryptMessage(
      senderCk,
      new TextEncoder().encode("bob is back"),
      aad,
    );
    const plaintext = await decryptMessage(
      receiverCk,
      envelope.ciphertext,
      envelope.nonce,
      aad,
    );
    expect(new TextDecoder().decode(plaintext)).toBe("bob is back");
  });
});