import { describe, expect, it } from "vitest";
import {
  generatePublicId,
  isValidPublicId,
  normalizePublicId,
} from "./public-id.js";

describe("public-id", () => {
  it("generates an 8-character uppercase id", () => {
    const id = generatePublicId();
    expect(id).toHaveLength(8);
    expect(isValidPublicId(id)).toBe(true);
  });

  it("normalizes user input", () => {
    expect(normalizePublicId(" ca7k9m2x ")).toBe("CA7K9M2X");
  });

  it("rejects invalid ids", () => {
    expect(isValidPublicId("")).toBe(false);
    expect(isValidPublicId("abc")).toBe(false);
    expect(isValidPublicId("CA7K-9M2")).toBe(false);
  });
});