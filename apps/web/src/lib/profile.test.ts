import { describe, expect, it, vi } from "vitest";
import { generateUniquePublicId } from "./profile";

describe("generateUniquePublicId", () => {
  it("returns first unused id", async () => {
    const exists = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const id = await generateUniquePublicId(exists);
    expect(id).toHaveLength(8);
    expect(exists).toHaveBeenCalledTimes(2);
  });

  it("throws after max attempts", async () => {
    await expect(
      generateUniquePublicId(async () => true, 3),
    ).rejects.toThrow("Failed to generate unique public id");
  });
});