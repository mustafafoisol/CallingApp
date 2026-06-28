import { redirect } from "next/navigation";
import { MessagesShellLayout } from "@/components/messages/messages-shell-layout";
import { loadContactsForUser } from "@/lib/contacts/load-contacts";
import { getAuthUser } from "@/lib/supabase/get-user";

export default async function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();

  if (!user) redirect("/login");

  const contacts = await loadContactsForUser(user.id);

  return (
    <MessagesShellLayout contacts={contacts}>{children}</MessagesShellLayout>
  );
}