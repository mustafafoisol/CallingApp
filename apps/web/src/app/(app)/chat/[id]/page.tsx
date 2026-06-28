import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { ChatView } from "./chat-view";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

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

  const { data: friend } = await supabase
    .from("profiles")
    .select("id, display_name, public_id")
    .eq("id", friendId)
    .single();

  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })
    .limit(50);

  return (
    <AppShell title={friend?.display_name ?? "Chat"}>
      <ChatView
        conversationId={id}
        currentUserId={user.id}
        friendId={friendId}
        friendName={friend?.display_name ?? "Friend"}
        initialMessages={messages ?? []}
      />
    </AppShell>
  );
}