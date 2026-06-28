import type { SupabaseClient } from "@supabase/supabase-js";

export const INITIAL_MESSAGE_LIMIT = 50;
export const OLDER_MESSAGE_PAGE_SIZE = 30;

export type MessageType = "text" | "image";

export interface MessageRow {
  id: string;
  sender_id: string;
  body: string;
  type?: MessageType;
  attachment_url?: string | null;
  created_at: string;
  removed_at?: string | null;
}

export const IMAGE_MESSAGE_PREVIEW = "[Image]";

export const REMOVED_MESSAGE_LABEL = "Message removed";

export async function fetchOlderMessages(
  supabase: SupabaseClient,
  conversationId: string,
  oldest: MessageRow,
  limit = OLDER_MESSAGE_PAGE_SIZE,
): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, sender_id, body, type, attachment_url, created_at, removed_at")
    .eq("conversation_id", conversationId)
    .or(
      `created_at.lt.${oldest.created_at},and(created_at.eq.${oldest.created_at},id.lt.${oldest.id})`,
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).reverse();
}