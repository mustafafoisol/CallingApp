import type { SupabaseClient } from "@supabase/supabase-js";

import type { CallingAppVault } from "@/lib/vault/schema";
import { type MessageEnvelopeRow } from "./envelope";
import { processEnvelope } from "./receive";

export async function catchUpEnvelopes(
  supabase: SupabaseClient,
  vault: CallingAppVault,
  recipientId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("message_envelopes")
    .select(
      "id, conversation_id, sender_id, recipient_id, type, ciphertext, nonce, sender_key_generation, attachment_id, created_at, expires_at",
    )
    .eq("recipient_id", recipientId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  let processed = 0;
  for (const row of (data ?? []) as MessageEnvelopeRow[]) {
    try {
      const result = await processEnvelope(supabase, vault, row);
      if (!result.skipped) processed += 1;
    } catch (err) {
      console.error("[e2ee] catch-up skipped envelope", row.id, err);
    }
  }
  return processed;
}