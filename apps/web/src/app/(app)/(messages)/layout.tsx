import { redirect } from "next/navigation";
import { MessagesShellLayout } from "@/components/messages/messages-shell-layout";
import { loadContactsForUser } from "@/lib/contacts/load-contacts.server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/get-user";

export default async function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();

  if (!user) redirect("/login");

  const [contacts, profileResult] = await Promise.all([
    loadContactsForUser(user.id),
    createClient()
      .then((supabase) =>
        supabase
          .from("profiles")
          .select("display_name, public_id, avatar_url")
          .eq("id", user.id)
          .single(),
      ),
  ]);

  const profile = profileResult.data;

  return (
    <MessagesShellLayout
      contacts={contacts}
      currentUserId={user.id}
      displayName={profile?.display_name ?? ""}
      publicId={profile?.public_id ?? ""}
      avatarUrl={profile?.avatar_url ?? null}
    >
      {children}
    </MessagesShellLayout>
  );
}