import type { SupabaseClient } from "@supabase/supabase-js";

import type { CallingAppVault } from "@/lib/vault/schema";
import { type MessageEnvelopeRow } from "./envelope";
import { processEnvelope, type ProcessEnvelopeResult } from "./receive";

const ENVELOPE_SELECT =
  "id, conversation_id, sender_id, recipient_id, type, ciphertext, nonce, sender_key_generation, attachment_id, created_at, expires_at";

async function processEnvelopeRows(
  supabase: SupabaseClient,
  vault: CallingAppVault,
  rows: MessageEnvelopeRow[],
  onMessage?: (result: ProcessEnvelopeResult, row: MessageEnvelopeRow) => void,
): Promise<number> {
  let processed = 0;
  for (const row of rows) {
    const result = await processEnvelope(supabase, vault, row);
    if (!result.skipped) {
      processed += 1;
      onMessage?.(result, row);
    }
  }
  return processed;
}

export async function catchUpEnvelopes(
  supabase: SupabaseClient,
  vault: CallingAppVault,
  recipientId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("message_envelopes")
    .select(ENVELOPE_SELECT)
    .eq("recipient_id", recipientId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  return processEnvelopeRows(supabase, vault, (data ?? []) as MessageEnvelopeRow[]);
}

export async function catchUpConversationEnvelopes(
  supabase: SupabaseClient,
  vault: CallingAppVault,
  recipientId: string,
  conversationId: string,
  onMessage?: (result: ProcessEnvelopeResult, row: MessageEnvelopeRow) => void,
): Promise<number> {
  const { data, error } = await supabase
    .from("message_envelopes")
    .select(ENVELOPE_SELECT)
    .eq("recipient_id", recipientId)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  return processEnvelopeRows(
    supabase,
    vault,
    (data ?? []) as MessageEnvelopeRow[],
    onMessage,
  );
}