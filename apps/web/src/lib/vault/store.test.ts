import "fake-indexeddb/auto";

import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  closeVault,
  getConversations,
  getIdentityKey,
  getMessages,
  getPeerPubkey,
  insertMessage,
  openVault,
  pinPeerPubkey,
  storeIdentityKey,
  updateConversation,
} from "./store";
import { wipeVault } from "./wipe";

const USER_ID = "test-user";

describe("vault store", () => {
  beforeEach(async () => {
    await wipeVault(USER_ID);
    await openVault(USER_ID);
  });

  afterEach(async () => {
    closeVault();
    await Dexie.delete(`callingapp-vault-${USER_ID}`);
  });

  it("stores and retrieves identity key", async () => {
    await storeIdentityKey({
      identityPrivateKey: new Uint8Array([1, 2]),
      identityPublicKey: new Uint8Array([3, 4]),
      keyGeneration: 1,
    });
    expect((await getIdentityKey())?.keyGeneration).toBe(1);
  });

  it("paginates messages by createdAt cursor", async () => {
    const base = {
      conversationId: "c1",
      senderId: "u1",
      type: "text" as const,
      attachmentId: null,
      removedAt: null,
    };
    await insertMessage({
      ...base,
      id: "m1",
      body: "first",
      createdAt: "2026-01-01T00:00:00Z",
    });
    await insertMessage({
      ...base,
      id: "m2",
      body: "second",
      createdAt: "2026-01-02T00:00:00Z",
    });
    const latest = await getMessages("c1", 1);
    expect(latest[0]?.id).toBe("m2");
    const older = await getMessages("c1", 10, "2026-01-02T00:00:00Z");
    expect(older[0]?.id).toBe("m1");
  });

  it("pins peer pubkey and lists conversations", async () => {
    await pinPeerPubkey("peer-1", new Uint8Array([9]), 2);
    expect((await getPeerPubkey("peer-1")).keyGeneration).toBe(2);
    await expect(getPeerPubkey("missing")).rejects.toThrow(/No pinned pubkey/);
    await updateConversation({
      id: "c1",
      preview: "hi",
      previewAt: "2026-01-02T00:00:00Z",
      unreadCount: 1,
      lastReadAt: null,
    });
    expect((await getConversations())[0]?.preview).toBe("hi");
  });
});