const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DEFAULT_LENGTH = 8;

export function generatePublicId(length = DEFAULT_LENGTH): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    const index = Math.floor(Math.random() * CHARSET.length);
    result += CHARSET[index];
  }
  return result;
}

export function isValidPublicId(value: string): boolean {
  if (value.length < 6 || value.length > 12) {
    return false;
  }
  return /^[A-Z0-9]+$/.test(value);
}

export function normalizePublicId(value: string): string {
  return value.trim().toUpperCase();
}