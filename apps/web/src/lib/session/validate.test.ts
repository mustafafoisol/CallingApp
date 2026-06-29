import { describe, expect, it } from "vitest";

import { sessionCookiesMatch } from "./validate";

describe("sessionCookiesMatch", () => {
  it("allows authenticated users before a device session is bound", () => {
    expect(sessionCookiesMatch(undefined, undefined, { session_version: 1, active_device_id: null })).toBe(
      true,
    );
  });

  it("rejects missing cookies when a device session exists", () => {
    expect(
      sessionCookiesMatch(undefined, undefined, {
        session_version: 2,
        active_device_id: "device-a",
      }),
    ).toBe(false);
  });

  it("accepts matching session cookies", () => {
    expect(
      sessionCookiesMatch("2", "device-a", {
        session_version: 2,
        active_device_id: "device-a",
      }),
    ).toBe(true);
  });

  it("rejects mismatched device id", () => {
    expect(
      sessionCookiesMatch("2", "device-b", {
        session_version: 2,
        active_device_id: "device-a",
      }),
    ).toBe(false);
  });
});