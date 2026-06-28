import type { SupabaseClient } from "@supabase/supabase-js";
import { canonicalizeParticipants } from "@calling-app/core";
import { REMOVED_MESSAGE_LABEL } from "@/lib/chat/messages";

export interface FriendProfile {
  id: string;
  public_id: string;
  display_name: string | null;
  last_seen_at: string | null;
}

export interface Contact {
  friendshipId: string;
  friend: FriendProfile;
  conversationId: string | null;
  lastMessageAt: string | null;
  preview: string | null;
}

interface FriendshipRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  requester: FriendProfile;
  addressee: FriendProfile;
}

export async function loadContacts(
  supabase: SupabaseClient,
  userId: string,
): Promise<Contact[]> {
  const { data: friendships } = await supabase
    .from("friendships")
    .select(
      "id, requester_id, addressee_id, requester:profiles!friendships_requester_id_fkey(id, public_id, display_name, last_seen_at), addressee:profiles!friendships_addressee_id_fkey(id, public_id, display_name, last_seen_at)",
    )
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  const rows = (friendships ?? []) as unknown as FriendshipRow[];

  const contacts = await Promise.all(
    rows.map(async (friendship) => {
      const friend =
        friendship.requester_id === userId
          ? friendship.addressee
          : friendship.requester;

      const pair = canonicalizeParticipants(userId, friend.id);
      const { data: conversation } = await supabase
        .from("conversations")
        .select("id, last_message_at")
        .eq("user_a_id", pair.userAId)
        .eq("user_b_id", pair.userBId)
        .maybeSingle();

      let preview: string | null = null;
      if (conversation?.id) {
        const { data: lastMsg } = await supabase
          .from("messages")
          .select("body, removed_at")
          .eq("conversation_id", conversation.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        preview = lastMsg?.removed_at
          ? REMOVED_MESSAGE_LABEL
          : (lastMsg?.body ?? null);
      }

      return {
        friendshipId: friendship.id,
        friend,
        conversationId: conversation?.id ?? null,
        lastMessageAt: conversation?.last_message_at ?? null,
        preview,
      };
    }),
  );

  contacts.sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bTime - aTime;
  });

  return contacts;
}