import "fake-indexeddb/auto";

import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ensureDeviceIdentity } from "./bootstrap";
import { openVault, closeVault } from "@/lib/vault/store";
import { wipeVault } from "@/lib/vault/wipe";
import { DEVICE_IDENTITY_KEY } from "@/lib/vault/schema";

const USER_ID = "bootstrap-user";

describe("ensureDeviceIdentity", () => {
  beforeEach(async () => {
    await wipeVault(USER_ID);
    await openVault(USER_ID);
  });

  afterEach(async () => {
    closeVault();
    await Dexie.delete(`callingapp-vault-${USER_ID}`);
  });

  it("publishes existing local identity to the server on each bootstrap", async () => {
    const vault = await openVault(USER_ID);
    await vault.device_identity.put({
      id: DEVICE_IDENTITY_KEY,
      identityPrivateKey: new Uint8Array([1, 2, 3]),
      identityPublicKey: new Uint8Array([4, 5, 6]),
      keyGeneration: 1,
    });

    const upsert = vi.fn(async () => ({ error: null }));
    const supabase = {
      from: vi.fn(() => ({ upsert })),
    };

    const identity = await ensureDeviceIdentity(
      supabase as never,
      vault,
      USER_ID,
    );

    expect(identity.identityPublicKey).toEqual(new Uint8Array([4, 5, 6]));
    expect(supabase.from).toHaveBeenCalledWith("user_crypto_keys");
    expect(upsert).toHaveBeenCalledOnce();
  });

  it("bumps key_generation when creating a new identity after logout", async () => {
    const vault = await openVault(USER_ID);
    const maybeSingle = vi.fn(async () => ({
      data: { key_generation: 2 },
      error: null,
    }));
    const upsert = vi.fn(async () => ({ error: null }));
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle })),
        })),
        upsert,
      })),
    };

    const identity = await ensureDeviceIdentity(
      supabase as never,
      vault,
      USER_ID,
    );

    expect(identity.keyGeneration).toBe(3);
    expect(upsert).toHaveBeenCalledOnce();
  });
});