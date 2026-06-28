export type FriendshipStatus = "pending" | "accepted" | "blocked";

export type MessageType = "text";

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
  created_at: string;
}