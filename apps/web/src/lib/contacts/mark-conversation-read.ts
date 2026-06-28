import type { SupabaseClient } from "@supabase/supabase-js";

export async function markConversationRead(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
) {
  const { error } = await supabase.from("conversation_reads").upsert(
    {
      conversation_id: conversationId,
      user_id: userId,
      last_read_at: new Date().toISOString(),
    },
    { onConflict: "conversation_id,user_id" },
  );

  if (error) throw error;
}