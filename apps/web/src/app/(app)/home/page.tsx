import { redirect } from "next/navigation";
import { ChatEmptyState } from "@/components/messages/chat-empty-state";
import { MessagesShell } from "@/components/messages/messages-shell";
import { loadContacts } from "@/lib/contacts/load-contacts";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const contacts = await loadContacts(supabase, user.id);

  return (
    <MessagesShell contacts={contacts}>
      <ChatEmptyState />
    </MessagesShell>
  );
}