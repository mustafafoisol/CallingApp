import {
  generatePublicId,
  isValidPublicId,
  normalizePublicId,
} from "@calling-app/core";

export async function generateUniquePublicId(
  exists: (id: string) => Promise<boolean>,
  maxAttempts = 10,
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = generatePublicId();
    if (!isValidPublicId(candidate)) continue;
    if (!(await exists(candidate))) return candidate;
  }
  throw new Error("Failed to generate unique public id");
}

export { normalizePublicId, isValidPublicId };