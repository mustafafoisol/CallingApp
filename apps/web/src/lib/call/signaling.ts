import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertTransition,
  getCallRole,
  type CallKind,
  type CallRecord,
  type CallStatus,
} from "@calling-app/core";

const SELECT =
  "id, conversation_id, caller_id, callee_id, kind, status, offer_sdp, answer_sdp, started_at, ended_at, created_at";

export type CallEventHandlers = {
  onInsert?: (call: CallRecord) => void;
  onUpdate?: (call: CallRecord) => void;
  onBroadcast?: (event: string, payload: Record<string, unknown>) => void;
};

async function getCall(supabase: SupabaseClient, callId: string) {
  const { data, error } = await supabase.from("calls").select(SELECT).eq("id", callId).single();
  if (error) throw error;
  return data as CallRecord;
}

async function patchCall(
  supabase: SupabaseClient,
  callId: string,
  patch: Record<string, string | null>,
) {
  const { data, error } = await supabase
    .from("calls")
    .update(patch)
    .eq("id", callId)
    .select(SELECT)
    .single();
  if (error) throw error;
  return data as CallRecord;
}

async function transition(
  supabase: SupabaseClient,
  callId: string,
  userId: string,
  to: CallStatus,
) {
  const call = await getCall(supabase, callId);
  const role = getCallRole(call.caller_id, call.callee_id, userId);
  if (!role) throw new Error("Not a call participant");
  assertTransition(call.status, to, role);
  const patch: Record<string, string> = { status: to };
  if (to === "accepted") patch.started_at = new Date().toISOString();
  if (to === "ended" || to === "rejected" || to === "missed" || to === "busy") {
    patch.ended_at = new Date().toISOString();
  }
  return patchCall(supabase, callId, patch);
}

export async function fetchRingingCallForCallee(
  supabase: SupabaseClient,
  userId: string,
): Promise<CallRecord | null> {
  const { data, error } = await supabase
    .from("calls")
    .select(SELECT)
    .eq("callee_id", userId)
    .eq("status", "ringing")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[call] fetch ringing failed", error);
    return null;
  }
  return data as CallRecord | null;
}

export async function createCall(
  supabase: SupabaseClient,
  userId: string,
  params: { conversationId: string; calleeId: string; kind: CallKind },
) {
  const { data, error } = await supabase
    .from("calls")
    .insert({
      conversation_id: params.conversationId,
      caller_id: userId,
      callee_id: params.calleeId,
      kind: params.kind,
      status: "ringing",
    })
    .select(SELECT)
    .single();
  if (error) throw error;
  return data as CallRecord;
}

export const acceptCall = (s: SupabaseClient, id: string, u: string) =>
  transition(s, id, u, "accepted");
export const rejectCall = (s: SupabaseClient, id: string, u: string) =>
  transition(s, id, u, "rejected");
export const endCall = (s: SupabaseClient, id: string, u: string) =>
  transition(s, id, u, "ended");
export const markCallMissed = (s: SupabaseClient, id: string, u: string) =>
  transition(s, id, u, "missed");
export const markCallBusy = (s: SupabaseClient, id: string, u: string) =>
  transition(s, id, u, "busy");

export async function writeOfferSdp(
  supabase: SupabaseClient,
  callId: string,
  userId: string,
  sdp: string,
) {
  const call = await getCall(supabase, callId);
  if (getCallRole(call.caller_id, call.callee_id, userId) !== "caller") {
    throw new Error("Only the caller can write offer SDP");
  }
  return patchCall(supabase, callId, { offer_sdp: sdp });
}

export async function writeAnswerSdp(
  supabase: SupabaseClient,
  callId: string,
  userId: string,
  sdp: string,
) {
  const call = await getCall(supabase, callId);
  if (getCallRole(call.caller_id, call.callee_id, userId) !== "callee") {
    throw new Error("Only the callee can write answer SDP");
  }
  return patchCall(supabase, callId, { answer_sdp: sdp });
}

export function subscribeToCall(
  supabase: SupabaseClient,
  callId: string,
  handlers: CallEventHandlers,
) {
  const channel = supabase
    .channel(`call:${callId}`, { config: { broadcast: { self: false } } })
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "calls", filter: `id=eq.${callId}` },
      (p) => handlers.onInsert?.(p.new as CallRecord),
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "calls", filter: `id=eq.${callId}` },
      (p) => handlers.onUpdate?.(p.new as CallRecord),
    )
    .on("broadcast", { event: "signal" }, ({ payload }) => {
      const row = payload as { event?: string };
      handlers.onBroadcast?.(row.event ?? "signal", payload as Record<string, unknown>);
    })
    .subscribe();
  return () => void supabase.removeChannel(channel);
}

function waitForSdpField(
  supabase: SupabaseClient,
  callId: string,
  field: "offer_sdp" | "answer_sdp",
  timeoutMs: number,
  label: string,
) {
  return async () => {
    const current = await getCall(supabase, callId);
    const existing = current[field];
    if (existing) return existing;
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        stop();
        reject(new Error(`Timed out waiting for ${label}`));
      }, timeoutMs);
      const stop = subscribeToCall(supabase, callId, {
        onUpdate: (call) => {
          const sdp = call[field];
          if (!sdp) return;
          clearTimeout(timer);
          stop();
          resolve(sdp);
        },
      });
    });
  };
}

export const waitForOfferSdp = (
  supabase: SupabaseClient,
  callId: string,
  timeoutMs = 45_000,
) => waitForSdpField(supabase, callId, "offer_sdp", timeoutMs, "offer SDP")();

export async function waitForAnswerSdp(
  supabase: SupabaseClient,
  callId: string,
  timeoutMs = 45_000,
) {
  return waitForSdpField(supabase, callId, "answer_sdp", timeoutMs, "answer SDP")();
}