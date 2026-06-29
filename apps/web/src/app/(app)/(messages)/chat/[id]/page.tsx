import { redirect } from "next/navigation";
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

  const [{ data: friend }, { data: friendship }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, public_id, avatar_url")
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
  ]);

  return (
    <ChatView
      conversationId={id}
      currentUserId={user.id}
      friendId={friendId}
      friendshipId={friendship?.id ?? null}
      friendName={friend?.display_name ?? "Friend"}
      canMessage={!!friendship}
      friendAvatarUrl={friend?.avatar_url ?? null}
    />
  );
}