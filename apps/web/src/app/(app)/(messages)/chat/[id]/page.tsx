import { redirect } from "next/navigation";
import { loadHiddenMessageIds } from "@/lib/chat/message-hides";
import { getAuthUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import { ChatView } from "./chat-view";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getAuthUser();

  if (!user) redirect("/login");

  const supabase = await createClient();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, user_a_id, user_b_id")
    .eq("id", id)
    .single();

  if (
    !conversation ||
    (conversation.user_a_id !== user.id && conversation.user_b_id !== user.id)
  ) {
    redirect("/home");
  }

  const friendId =
    conversation.user_a_id === user.id
      ? conversation.user_b_id
      : conversation.user_a_id;

  const [{ data: friend }, { data: friendship }, { data: recentMessages }, hiddenIds] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, public_id")
        .eq("id", friendId)
        .single(),
      supabase
        .from("friendships")
        .select("id, status")
        .or(
          `and(requester_id.eq.${user.id},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${user.id})`,
        )
        .eq("status", "accepted")
        .maybeSingle(),
      supabase
        .from("messages")
        .select(
          "id, sender_id, body, type, attachment_url, created_at, removed_at",
        )
        .eq("conversation_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
      loadHiddenMessageIds(supabase, user.id, id),
    ]);

  const messages = (recentMessages ?? [])
    .filter((m) => !hiddenIds.has(m.id))
    .slice()
    .reverse();

  return (
    <ChatView
      conversationId={id}
      currentUserId={user.id}
      friendId={friendId}
      friendshipId={friendship?.id ?? null}
      friendName={friend?.display_name ?? "Friend"}
      canMessage={!!friendship}
      initialMessages={messages}
      initialHiddenMessageIds={[...hiddenIds]}
    />
  );
}