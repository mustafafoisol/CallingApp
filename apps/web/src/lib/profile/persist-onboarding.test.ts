import { beforeEach, describe, expect, it, vi } from "vitest";

const createAdminClient = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => createAdminClient(),
}));

import { persistOnboardingProfile } from "./persist-onboarding";

function createQueryChain(result: { data: unknown; error: unknown }) {
  const chain = {
    upsert: vi.fn(() => chain),
    select: vi.fn(() => chain),
    single: vi.fn(async () => result),
  };
  return chain;
}

describe("persistOnboardingProfile", () => {
  beforeEach(() => {
    createAdminClient.mockReset();
  });

  it("returns saved profile from user client upsert", async () => {
    const chain = createQueryChain({
      data: {
        id: "user-1",
        public_id: "ABCD1234",
        display_name: "Alex",
        session_version: 1,
        active_device_id: null,
      },
      error: null,
    });
    const supabase = { from: vi.fn(() => chain) };

    const result = await persistOnboardingProfile(
      supabase as never,
      "user-1",
      "Alex",
      "ABCD1234",
    );

    expect(result).toEqual({
      data: {
        id: "user-1",
        public_id: "ABCD1234",
        display_name: "Alex",
        session_version: 1,
        active_device_id: null,
      },
    });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("falls back to admin client when user upsert returns no row", async () => {
    const userChain = createQueryChain({ data: null, error: null });
    const adminChain = createQueryChain({
      data: {
        id: "user-1",
        public_id: "WXYZ9876",
        display_name: "Alex",
        session_version: 1,
        active_device_id: null,
      },
      error: null,
    });

    const supabase = { from: vi.fn(() => userChain) };
    createAdminClient.mockReturnValue({ from: vi.fn(() => adminChain) });

    const result = await persistOnboardingProfile(
      supabase as never,
      "user-1",
      "Alex",
      "WXYZ9876",
    );

    expect(result).toEqual({
      data: {
        id: "user-1",
        public_id: "WXYZ9876",
        display_name: "Alex",
        session_version: 1,
        active_device_id: null,
      },
    });
    expect(createAdminClient).toHaveBeenCalledOnce();
  });
});