import { describe, expect, it } from "vitest";
import {
  canonicalizeParticipants,
  isConversationParticipant,
} from "./conversation.js";

describe("conversation", () => {
  it("orders participants consistently", () => {
    const pair = canonicalizeParticipants("user-b", "user-a");
    expect(pair).toEqual({ userAId: "user-a", userBId: "user-b" });
  });

  it("throws for same user", () => {
    expect(() => canonicalizeParticipants("user-a", "user-a")).toThrow();
  });

  it("checks participant membership", () => {
    const pair = canonicalizeParticipants("user-a", "user-b");
    expect(isConversationParticipant(pair, "user-a")).toBe(true);
    expect(isConversationParticipant(pair, "user-c")).toBe(false);
  });
});