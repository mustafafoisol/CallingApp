import type { SupabaseClient } from "@supabase/supabase-js";

import {
  ENVELOPE_SELECT_COLUMNS,
  ENVELOPE_SELECT_LEGACY,
  isMissingCryptoMetaColumn,
  normalizeEnvelopeRow,
  type MessageEnvelopeRow,
} from "./envelope";

export async function listEnvelopesForRecipient(
  supabase: SupabaseClient,
  recipientId: string,
  options?: { conversationId?: string },
): Promise<MessageEnvelopeRow[]> {
  let query = supabase
    .from("message_envelopes")
    .select(ENVELOPE_SELECT_COLUMNS)
    .eq("recipient_id", recipientId);

  if (options?.conversationId) {
    query = query.eq("conversation_id", options.conversationId);
  }

  const result = await query.order("created_at", { ascending: true });
  if (!result.error) {
    return (result.data ?? []).map((row) => normalizeEnvelopeRow(row));
  }

  if (!isMissingCryptoMetaColumn(result.error)) {
    throw result.error;
  }

  let legacyQuery = supabase
    .from("message_envelopes")
    .select(ENVELOPE_SELECT_LEGACY)
    .eq("recipient_id", recipientId);

  if (options?.conversationId) {
    legacyQuery = legacyQuery.eq("conversation_id", options.conversationId);
  }

  const legacy = await legacyQuery.order("created_at", { ascending: true });
  if (legacy.error) throw legacy.error;
  return (legacy.data ?? []).map((row) => normalizeEnvelopeRow(row));
}