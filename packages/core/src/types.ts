export type FriendshipStatus = "pending" | "accepted" | "declined";

export type MessageType = "text" | "image";

export interface Profile {
  id: string;
  public_id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  last_seen_at: string | null;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_a_id: string;
  user_b_id: string;
  last_message_at: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  type: MessageType;
  attachment_url: string | null;
  created_at: string;
  removed_at: string | null;
}

export type CallKind = "voice" | "video";

export type CallStatus =
  | "ringing"
  | "accepted"
  | "ended"
  | "missed"
  | "rejected"
  | "busy";

export type CallRole = "caller" | "callee";

export interface CallRecord {
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