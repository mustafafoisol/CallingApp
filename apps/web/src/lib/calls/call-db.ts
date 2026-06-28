import type { SupabaseClient } from "@supabase/supabase-js";
import type { CallRow, CallStatus } from "@calling-app/core";

const CALL_SELECT =
  "id, conversation_id, caller_id, callee_id, kind, status, offer_sdp, answer_sdp, started_at, ended_at, created_at";

export async function createVoiceCall(
  supabase: SupabaseClient,
  conversationId: string,
  callerId: string,
  calleeId: string,
  offerSdp: string,
): Promise<CallRow> {
  const { data, error } = await supabase
    .from("calls")
    .insert({
      conversation_id: conversationId,
      caller_id: callerId,
      callee_id: calleeId,
      kind: "voice",
      status: "ringing",
      offer_sdp: offerSdp,
    })
    .select(CALL_SELECT)
    .single();

  if (error) throw error;
  return data as CallRow;
}

export async function acceptVoiceCall(
  supabase: SupabaseClient,
  callId: string,
  answerSdp: string,
): Promise<CallRow> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("calls")
    .update({
      status: "accepted",
      answer_sdp: answerSdp,
      started_at: now,
    })
    .eq("id", callId)
    .select(CALL_SELECT)
    .single();

  if (error) throw error;
  return data as CallRow;
}

export async function updateCallStatus(
  supabase: SupabaseClient,
  callId: string,
  status: CallStatus,
): Promise<void> {
  const patch: Record<string, string> = { status };
  if (status === "ended" || status === "rejected" || status === "missed") {
    patch.ended_at = new Date().toISOString();
  }

  const { error } = await supabase.from("calls").update(patch).eq("id", callId);
  if (error) throw error;
}