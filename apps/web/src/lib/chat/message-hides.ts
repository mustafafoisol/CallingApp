import type { SupabaseClient } from "@supabase/supabase-js";

export async function loadHiddenMessageIds(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
): Promise<Set<string>> {
  const { data: hides } = await supabase
    .from("message_hides")
    .select("message_id")
    .eq("user_id", userId);

  if (!hides?.length) return new Set();

  const candidateIds = hides.map((h) => h.message_id);
  const { data: inConversation } = await supabase
    .from("messages")
    .select("id")
    .eq("conversation_id", conversationId)
    .in("id", candidateIds);

  return new Set((inConversation ?? []).map((m) => m.id));
}