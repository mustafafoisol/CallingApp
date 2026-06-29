import type { SupabaseClient } from "@supabase/supabase-js";

interface FriendshipAcceptedPayload {
  friendshipId: string;
  friendId: string;
}

export function subscribeToFriendshipAccepted(
  supabase: SupabaseClient,
  userId: string,
  onAccepted: (payload: FriendshipAcceptedPayload) => void,
): () => void {
  let channel: ReturnType<typeof supabase.channel> | null = null;
  let cancelled = false;

  async function subscribe() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (cancelled || !session) return;

    channel = supabase
      .channel(`friendships-accepted:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "friendships",
          filter: `requester_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as {
            id?: string;
            status?: string;
            addressee_id?: string;
          };
          const previous = payload.old as { status?: string } | undefined;

          if (row.status !== "accepted" || previous?.status === "accepted") {
            return;
          }
          if (!row.id || !row.addressee_id) return;

          onAccepted({
            friendshipId: row.id,
            friendId: row.addressee_id,
          });
        },
      )
      .subscribe();
  }

  void subscribe();

  return () => {
    cancelled = true;
    if (channel) void supabase.removeChannel(channel);
  };
}