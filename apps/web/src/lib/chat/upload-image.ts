import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_UPLOAD_BYTES = 1_048_576;
const BUCKET = "chat-media";

function extensionForFile(file: File): string {
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  return "jpg";
}

export async function uploadChatImage(
  supabase: SupabaseClient,
  file: File,
  conversationId: string,
): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Image must be 1 MB or smaller after compression.");
  }

  const ext = extensionForFile(file);
  const path = `${conversationId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) throw error;

  return path;
}