export const MAX_AVATAR_BYTES = 100 * 1024;
export const MAX_AVATAR_SIZE_MESSAGE =
  "Please upload a smaller file (max 100 KB).";
export const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp";

export function validateAvatarFileSize(file: File): string | null {
  if (file.size > MAX_AVATAR_BYTES) {
    return MAX_AVATAR_SIZE_MESSAGE;
  }
  return null;
}