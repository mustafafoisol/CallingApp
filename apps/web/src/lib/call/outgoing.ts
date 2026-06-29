import type { SupabaseClient } from "@supabase/supabase-js";

import { createCall } from "./signaling";

export async function startOutgoingCall(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
  calleeId: string,
) {
  return createCall(supabase, userId, {
    conversationId,
    calleeId,
    kind: "voice",
  });
}