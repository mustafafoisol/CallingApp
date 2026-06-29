import type { SupabaseClient } from "@supabase/supabase-js";

import type { CallingAppVault } from "@/lib/vault/schema";
import { listEnvelopesForRecipient } from "./envelope-query";
import { processEnvelope } from "./receive";

export async function catchUpEnvelopes(
  supabase: SupabaseClient,
  vault: CallingAppVault,
  recipientId: string,
): Promise<number> {
  const rows = await listEnvelopesForRecipient(supabase, recipientId);

  let processed = 0;
  for (const row of rows) {
    try {
      const result = await processEnvelope(supabase, vault, row);
      if (!result.skipped) processed += 1;
    } catch (err) {
      console.error("[e2ee] catch-up skipped envelope", row.id, err);
    }
  }
  return processed;
}