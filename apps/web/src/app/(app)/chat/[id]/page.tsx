import { redirect } from "next/navigation";
import { MessagesShell } from "@/components/messages/messages-shell";
import { loadContacts } from "@/lib/contacts/load-contacts";
import { loadHiddenMessageIds } from "@/lib/chat/message-hides";
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

  const [{ data: friend }, { data: recentMessages }, contacts, hiddenIds] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, public_id")
        .eq("id", friendId)
        .single(),
      supabase
        .from("messages")
        .select(
          "id, sender_id, body, type, attachment_url, created_at, removed_at",
        )
        .eq("conversation_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
      loadContacts(supabase, user.id),
      loadHiddenMessageIds(supabase, user.id, id),
    ]);

  const messages = (recentMessages ?? [])
    .filter((m) => !hiddenIds.has(m.id))
    .slice()
    .reverse();

  return (
    <MessagesShell contacts={contacts} activeConversationId={id}>
      <ChatView
        conversationId={id}
        currentUserId={user.id}
        friendId={friendId}
        friendName={friend?.display_name ?? "Friend"}
        initialMessages={messages}
        initialHiddenMessageIds={[...hiddenIds]}
      />
    </MessagesShell>
  );
}