import type { SupabaseClient } from "@supabase/supabase-js";

export async function removeMessage(
  supabase: SupabaseClient,
  messageId: string,
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("messages")
    .update({ removed_at: new Date().toISOString(), body: "" })
    .eq("id", messageId);

  if (!error) return { error: null };

  const message = error.message.includes("policy")
    ? "Could not remove message — you may only remove your own messages."
    : error.message;

  return { error: new Error(message) };
}