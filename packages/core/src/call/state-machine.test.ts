import { describe, expect, it } from "vitest";

import {
  assertTransition,
  canTransition,
  getCallRole,
  isTerminal,
} from "./state-machine.js";

const CALLER = "11111111-1111-1111-1111-111111111111";
const CALLEE = "22222222-2222-2222-2222-222222222222";

describe("call state machine", () => {
  describe("isTerminal", () => {
    it("marks ended outcomes as terminal", () => {
      expect(isTerminal("ended")).toBe(true);
      expect(isTerminal("missed")).toBe(true);
      expect(isTerminal("rejected")).toBe(true);
      expect(isTerminal("busy")).toBe(true);
    });

    it("marks active states as non-terminal", () => {
      expect(isTerminal("ringing")).toBe(false);
      expect(isTerminal("accepted")).toBe(false);
    });
  });

  describe("getCallRole", () => {
    it("resolves caller and callee", () => {
      expect(getCallRole(CALLER, CALLEE, CALLER)).toBe("caller");
      expect(getCallRole(CALLER, CALLEE, CALLEE)).toBe("callee");
      expect(getCallRole(CALLER, CALLEE, "other")).toBeNull();
    });
  });

  describe("ringing transitions", () => {
    it("allows callee to accept, reject, miss, or mark busy", () => {
      expect(canTransition("ringing", "accepted", "callee")).toBe(true);
      expect(canTransition("ringing", "rejected", "callee")).toBe(true);
      expect(canTransition("ringing", "missed", "callee")).toBe(true);
      expect(canTransition("ringing", "busy", "callee")).toBe(true);
    });

    it("allows caller to cancel or mark missed on timeout", () => {
      expect(canTransition("ringing", "ended", "caller")).toBe(true);
      expect(canTransition("ringing", "missed", "caller")).toBe(true);
    });

    it("forbids caller from accepting", () => {
      expect(canTransition("ringing", "accepted", "caller")).toBe(false);
    });

    it("forbids callee from ending before accept", () => {
      expect(canTransition("ringing", "ended", "callee")).toBe(false);
    });
  });

  describe("accepted transitions", () => {
    it("allows either party to end the call", () => {
      expect(canTransition("accepted", "ended", "caller")).toBe(true);
      expect(canTransition("accepted", "ended", "callee")).toBe(true);
    });

    it("forbids returning to ringing", () => {
      expect(canTransition("accepted", "ringing", "caller")).toBe(false);
      expect(canTransition("accepted", "ringing", "callee")).toBe(false);
    });
  });

  describe("terminal transitions", () => {
    it("forbids leaving terminal states", () => {
      for (const status of ["ended", "missed", "rejected", "busy"] as const) {
        expect(canTransition(status, "ringing", "caller")).toBe(false);
        expect(canTransition(status, "accepted", "callee")).toBe(false);
      }
    });
  });

  describe("assertTransition", () => {
    it("throws on invalid transitions", () => {
      expect(() => assertTransition("ended", "ringing", "caller")).toThrow(
        /Invalid call transition/,
      );
    });

    it("does not throw on valid transitions", () => {
      expect(() =>
        assertTransition("ringing", "accepted", "callee"),
      ).not.toThrow();
    });
  });
});