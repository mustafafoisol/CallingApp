export type CallKind = "voice";

export type CallStatus =
  | "ringing"
  | "accepted"
  | "ended"
  | "missed"
  | "rejected";

export type CallState =
  | "idle"
  | "outgoing"
  | "incoming"
  | "connecting"
  | "connected"
  | "ended";

export interface CallRow {
  id: string;
  conversation_id: string;
  caller_id: string;
  callee_id: string;
  kind: CallKind;
  status: CallStatus;
  offer_sdp: string | null;
  answer_sdp: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}