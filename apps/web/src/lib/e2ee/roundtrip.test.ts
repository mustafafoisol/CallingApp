import "fake-indexeddb/auto";

import {
  buildAad,
  decryptMessage,
  exportPrivateKeyRaw,
  exportPublicKeyRaw,
  generateIdentityKeyPair,
} from "@calling-app/core";
import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEVICE_IDENTITY_KEY } from "@/lib/vault/schema";
import { closeVault, openVault } from "@/lib/vault/store";
import { wipeVault } from "@/lib/vault/wipe";
import { serializeBytea } from "./envelope";
import { ensureConversationKey } from "./key-exchange";
import { processEnvelope } from "./receive";
import { sendEncryptedText } from "./send";

const CONVERSATION_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const ALICE_ID = "11111111-2222-3333-4444-555555555555";
const BOB_ID = "22222222-3333-4444-5555-666666666666";

async function seedIdentity(
  userId: string,
  keyGeneration: number,
) {
  const pair = await generateIdentityKeyPair();
  const vault = await openVault(userId);
  await vault.device_identity.put({
    id: DEVICE_IDENTITY_KEY,
    identityPrivateKey: await exportPrivateKeyRaw(pair.privateKey),
    identityPublicKey: await exportPublicKeyRaw(pair.publicKey),
    keyGeneration,
  });
  return {
    vault,
    pubkey: await exportPublicKeyRaw(pair.publicKey),
  };
}

function mockSupabase(peerKeys: Record<string, { pubkey: Uint8Array; key_generation: number }>) {
  const envelopes: Array<Record<string, unknown>> = [];

  const from = vi.fn((table: string) => {
    if (table === "user_crypto_keys") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn((_col: string, userId: string) => ({
            maybeSingle: vi.fn(async () => {
              const peer = peerKeys[userId];
              if (!peer) return { data: null, error: null };
              return {
                data: {
                  user_id: userId,
                  identity_pubkey: serializeBytea(peer.pubkey),
                  key_generation: peer.key_generation,
                  updated_at: "2026-06-28T00:00:00Z",
                },
                error: null,
              };
            }),
          })),
        })),
      };
    }

    if (table === "message_envelopes") {
      return {
        insert: vi.fn(async (row: Record<string, unknown>) => {
          envelopes.push(row);
          return { error: null };
        }),
        delete: vi.fn(() => ({
          eq: vi.fn(async () => ({ error: null })),
        })),
      };
    }

    throw new Error(`Unexpected table ${table}`);
  });

  return { from, envelopes };
}

describe("E2EE text roundtrip", () => {
  beforeEach(async () => {
    await wipeVault(ALICE_ID);
    await wipeVault(BOB_ID);
  });

  afterEach(async () => {
    closeVault();
    await Dexie.delete(`callingapp-vault-${ALICE_ID}`);
    await Dexie.delete(`callingapp-vault-${BOB_ID}`);
  });

  it("decrypts when sender and recipient key_generation differ", async () => {
    const alice = await seedIdentity(ALICE_ID, 2);
    const bob = await seedIdentity(BOB_ID, 1);
    const supabase = mockSupabase({
      [ALICE_ID]: { pubkey: alice.pubkey, key_generation: 2 },
      [BOB_ID]: { pubkey: bob.pubkey, key_generation: 1 },
    });

    const messageId = "66666666-7777-8888-9999-aaaaaaaaaaaa";
    await sendEncryptedText(supabase as never, alice.vault, {
      conversationId: CONVERSATION_ID,
      recipientId: BOB_ID,
      senderId: ALICE_ID,
      messageId,
      body: "hello bob",
    });

    const row = supabase.envelopes[0];
    expect(row.sender_key_generation).toBe(2);

    const ck = await ensureConversationKey(
      bob.vault,
      supabase as never,
      CONVERSATION_ID,
      ALICE_ID,
      row.sender_key_generation as number,
    );
    const aad = buildAad({
      conversationId: CONVERSATION_ID,
      senderId: ALICE_ID,
      messageId,
      type: "text",
      senderKeyGeneration: row.sender_key_generation as number,
    });
    const plaintext = await decryptMessage(
      ck,
      new Uint8Array((row.ciphertext as string).slice(2).match(/.{2}/g)!.map((h) => parseInt(h, 16))),
      new Uint8Array((row.nonce as string).slice(2).match(/.{2}/g)!.map((h) => parseInt(h, 16))),
      aad,
    );

    expect(new TextDecoder().decode(plaintext)).toBe("hello bob");
  });

  it("processEnvelope decrypts realtime-style bare hex bytea", async () => {
    const alice = await seedIdentity(ALICE_ID, 1);
    const bob = await seedIdentity(BOB_ID, 1);
    const supabase = mockSupabase({
      [ALICE_ID]: { pubkey: alice.pubkey, key_generation: 1 },
      [BOB_ID]: { pubkey: bob.pubkey, key_generation: 1 },
    });

    const messageId = "88888888-9999-aaaa-bbbb-cccccccccccc";
    const sent = await sendEncryptedText(supabase as never, alice.vault, {
      conversationId: CONVERSATION_ID,
      recipientId: BOB_ID,
      senderId: ALICE_ID,
      messageId,
      body: "bare hex path",
    });

    const inserted = supabase.envelopes[0];
    const ciphertextHex = (inserted.ciphertext as string).slice(2);
    const nonceHex = (inserted.nonce as string).slice(2);

    const result = await processEnvelope(supabase as never, bob.vault, {
      id: messageId.toUpperCase(),
      conversation_id: CONVERSATION_ID,
      sender_id: ALICE_ID,
      recipient_id: BOB_ID,
      type: "text",
      ciphertext: ciphertextHex,
      nonce: nonceHex,
      sender_key_generation: "1",
      attachment_id: null,
      created_at: sent.createdAt,
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    });

    expect(result.body).toBe("bare hex path");
  });

  it("processEnvelope decrypts a sent envelope", async () => {
    const alice = await seedIdentity(ALICE_ID, 2);
    const bob = await seedIdentity(BOB_ID, 1);
    const supabase = mockSupabase({
      [ALICE_ID]: { pubkey: alice.pubkey, key_generation: 2 },
      [BOB_ID]: { pubkey: bob.pubkey, key_generation: 1 },
    });

    const messageId = "77777777-8888-9999-aaaa-bbbbbbbbbbbb";
    const sent = await sendEncryptedText(supabase as never, alice.vault, {
      conversationId: CONVERSATION_ID,
      recipientId: BOB_ID,
      senderId: ALICE_ID,
      messageId,
      body: "via processEnvelope",
    });

    const inserted = supabase.envelopes[0];
    const result = await processEnvelope(supabase as never, bob.vault, {
      id: messageId,
      conversation_id: CONVERSATION_ID,
      sender_id: ALICE_ID,
      recipient_id: BOB_ID,
      type: "text",
      ciphertext: inserted.ciphertext as string,
      nonce: inserted.nonce as string,
      sender_key_generation: inserted.sender_key_generation as number,
      attachment_id: null,
      created_at: sent.createdAt,
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    });

    expect(result.skipped).toBe(false);
    expect(result.body).toBe("via processEnvelope");
    const stored = await bob.vault.messages.get(messageId);
    expect(stored?.body).toBe("via processEnvelope");
  });
});