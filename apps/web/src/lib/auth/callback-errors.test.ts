import { describe, expect, it } from "vitest";

import {
  authFailureFromExchangeError,
  authFailureMessage,
} from "./callback-errors";

describe("authFailureFromExchangeError", () => {
  it("detects reused oauth codes", () => {
    expect(
      authFailureFromExchangeError(
        "invalid request: both auth code and code verifier should be non-empty",
      ),
    ).toBe("pkce_expired");
    expect(
      authFailureFromExchangeError("Invalid grant: code has already been used"),
    ).toBe("code_reused");
  });
});

describe("authFailureMessage", () => {
  it("returns actionable copy for reused codes", () => {
    expect(authFailureMessage("code_reused")).toContain("already used");
  });
});