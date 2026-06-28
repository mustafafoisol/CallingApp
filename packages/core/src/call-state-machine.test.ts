import { describe, expect, it } from "vitest";
import { canTransition, transitionCallState } from "./call-state-machine.js";

describe("call-state-machine", () => {
  it("allows idle to outgoing", () => {
    expect(canTransition("idle", "outgoing")).toBe(true);
    expect(transitionCallState("idle", "outgoing")).toBe("outgoing");
  });

  it("rejects invalid transitions", () => {
    expect(() => transitionCallState("idle", "connected")).toThrow();
  });
});