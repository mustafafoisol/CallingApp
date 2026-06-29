import type { SupabaseClient } from "@supabase/supabase-js";
import { canonicalizeParticipants } from "@calling-app/core";
import { IMAGE_MESSAGE_PREVIEW, REMOVED_MESSAGE_LABEL } from "@/lib/chat/messages";

export interface FriendProfile {
  id: string;
  public_id: string;
  display_name: string | null;
  avatar_url: string | null;
  last_seen_at: string | null;
}

export interface Contact {
  friendshipId: string;
  friend: FriendProfile;
  conversationId: string | null;
  lastMessageAt: string | null;
  preview: string | null;
  unreadCount: number;
}

interface FriendshipRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  requester: FriendProfile;
  addressee: FriendProfile;
}

interface ConversationRow {
  id: string;
  user_a_id: string;
  user_b_id: string;
  last_message_at: string | null;
}

interface PreviewRow {
  conversation_id: string;
  body: string;
  type: string;
  removed_at: string | null;
}

interface UnreadRow {
  conversation_id: string;
  unread_count: number;
}

function previewText(msg: PreviewRow): string {
  if (msg.removed_at) return REMOVED_MESSAGE_LABEL;
  if (msg.type === "image") return IMAGE_MESSAGE_PREVIEW;
  return msg.body;
}

async function loadContactsImpl(
  supabase: SupabaseClient,
  userId: string,
): Promise<Contact[]> {
  const { data: friendships } = await supabase
    .from("friendships")
    .select(
      "id, requester_id, addressee_id, requester:profiles!friendships_requester_id_fkey(id, public_id, display_name, avatar_url, last_seen_at), addressee:profiles!friendships_addressee_id_fkey(id, public_id, display_name, avatar_url, last_seen_at)",
    )
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  const rows = (friendships ?? []) as unknown as FriendshipRow[];
  if (rows.length === 0) return [];

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, user_a_id, user_b_id, last_message_at")
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);

  const conversationByPair = new Map<string, ConversationRow>();
  for (const conversation of conversations ?? []) {
    const key = `${conversation.user_a_id}:${conversation.user_b_id}`;
    conversationByPair.set(key, conversation);
  }

  const conversationIds = (conversations ?? []).map((c) => c.id);
  const previewByConversation = new Map<string, string>();
  const unreadByConversation = new Map<string, number>();

  if (conversationIds.length > 0) {
    const [{ data: previews }, { data: unreadRows }] = await Promise.all([
      supabase.rpc("latest_message_previews", {
        conversation_ids: conversationIds,
      }),
      supabase.rpc("conversation_unread_counts", {
        conversation_ids: conversationIds,
      }),
    ]);

    for (const row of (previews ?? []) as PreviewRow[]) {
      previewByConversation.set(row.conversation_id, previewText(row));
    }

    for (const row of (unreadRows ?? []) as UnreadRow[]) {
      unreadByConversation.set(row.conversation_id, Number(row.unread_count));
    }
  }

  const contacts = rows.map((friendship) => {
    const friend =
      friendship.requester_id === userId
        ? friendship.addressee
        : friendship.requester;

    const pair = canonicalizeParticipants(userId, friend.id);
    const pairKey = `${pair.userAId}:${pair.userBId}`;
    const conversation = conversationByPair.get(pairKey);

    return {
      friendshipId: friendship.id,
      friend,
      conversationId: conversation?.id ?? null,
      lastMessageAt: conversation?.last_message_at ?? null,
      preview: conversation?.id
        ? (previewByConversation.get(conversation.id) ?? null)
        : null,
      unreadCount: conversation?.id
        ? (unreadByConversation.get(conversation.id) ?? 0)
        : 0,
    };
  });

  contacts.sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bTime - aTime;
  });

  return contacts;
}

export async function loadContacts(
  supabase: SupabaseClient,
  userId: string,
): Promise<Contact[]> {
  return loadContactsImpl(supabase, userId);
}