import type { SupabaseClient } from "@supabase/supabase-js";

export async function hideMessage(
  supabase: SupabaseClient,
  messageId: string,
  userId: string,
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("message_hides").insert({
    user_id: userId,
    message_id: messageId,
  });

  if (!error) return { error: null };

  const message = error.message.includes("policy")
    ? "Could not hide this message."
    : error.message;

  return { error: new Error(message) };
}