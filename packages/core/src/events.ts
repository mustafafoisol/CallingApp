export type UserEventType = "add-friend";

export type AddFriendEventStatus = "sent" | "accepted" | "ignored";

export interface AddFriendEventPayload {
  friendship_id: string;
  peer_id: string;
  peer_display_name: string | null;
  peer_public_id: string;
  peer_avatar_url: string | null;
  conversation_id?: string | null;
}

export interface UserEventRow {
  id: string;
  recipient_id: string;
  event_type: UserEventType;
  status: AddFriendEventStatus;
  payload: AddFriendEventPayload;
  created_at: string;
}