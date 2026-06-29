import "fake-indexeddb/auto";

import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prefetchPeerPublicKey } from "./key-exchange";
import { closeVault, openVault } from "@/lib/vault/store";
import { wipeVault } from "@/lib/vault/wipe";

const USER_ID = "prefetch-user";
const PEER_ID = "peer-user";

const PEER_PUBKEY_HEX = "cd".repeat(32);

describe("prefetchPeerPublicKey", () => {
  beforeEach(async () => {
    await wipeVault(USER_ID);
    await openVault(USER_ID);
  });

  afterEach(async () => {
    closeVault();
    await Dexie.delete(`callingapp-vault-${USER_ID}`);
  });

  it("pins peer pubkey when available", async () => {
    const vault = await openVault(USER_ID);
    const maybeSingle = vi.fn(async () => ({
      data: {
        user_id: PEER_ID,
        identity_pubkey: `\\x${PEER_PUBKEY_HEX}`,
        key_generation: 1,
        updated_at: "2026-01-01T00:00:00Z",
      },
      error: null,
    }));
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle })),
        })),
      })),
    };

    const available = await prefetchPeerPublicKey(
      vault,
      supabase as never,
      PEER_ID,
    );

    expect(available).toBe(true);
    const pinned = await vault.trusted_pubkeys.get(PEER_ID);
    expect(pinned?.keyGeneration).toBe(1);
    expect(pinned?.identityPubkey?.length).toBe(32);
  });

  it("returns false when peer has not published a key", async () => {
    const vault = await openVault(USER_ID);
    const maybeSingle = vi.fn(async () => ({ data: null, error: null }));
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle })),
        })),
      })),
    };

    const available = await prefetchPeerPublicKey(
      vault,
      supabase as never,
      PEER_ID,
    );

    expect(available).toBe(false);
    expect(await vault.trusted_pubkeys.get(PEER_ID)).toBeUndefined();
  });
});