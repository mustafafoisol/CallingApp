import { describe, expect, it } from "vitest";

import { parseIdentityPubkey } from "./envelope";

const VALID_PUBKEY_HEX = "ab".repeat(32);

describe("parseIdentityPubkey", () => {
  it("accepts \\x-prefixed hex bytea", () => {
    const bytes = parseIdentityPubkey(`\\x${VALID_PUBKEY_HEX}`);
    expect(bytes).toEqual(parseIdentityPubkey(VALID_PUBKEY_HEX));
    expect(bytes?.length).toBe(32);
  });

  it("rejects wrong-length values", () => {
    expect(parseIdentityPubkey("\\x040506")).toBeNull();
    expect(parseIdentityPubkey("")).toBeNull();
  });
});