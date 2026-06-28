import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { canonicalizeParticipants } from "@calling-app/core";

interface FriendProfile {
  id: string;
  public_id: string;
  display_name: string | null;
  last_seen_at: string | null;
}

interface FriendshipRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  requester: FriendProfile;
  addressee: FriendProfile;
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: friendships } = await supabase
    .from("friendships")
    .select(
      "id, requester_id, addressee_id, requester:profiles!friendships_requester_id_fkey(id, public_id, display_name, last_seen_at), addressee:profiles!friendships_addressee_id_fkey(id, public_id, display_name, last_seen_at)",
    )
    .eq("status", "accepted")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  const rows = (friendships ?? []) as unknown as FriendshipRow[];

  const contacts = await Promise.all(
    rows.map(async (friendship) => {
      const friend =
        friendship.requester_id === user.id
          ? friendship.addressee
          : friendship.requester;

      const pair = canonicalizeParticipants(user.id, friend.id);
      const { data: conversation } = await supabase
        .from("conversations")
        .select("id, last_message_at")
        .eq("user_a_id", pair.userAId)
        .eq("user_b_id", pair.userBId)
        .maybeSingle();

      return {
        friendshipId: friendship.id,
        friend,
        conversationId: conversation?.id ?? null,
        lastMessageAt: conversation?.last_message_at ?? null,
      };
    }),
  );

  contacts.sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bTime - aTime;
  });

  return (
    <AppShell title="Contacts">
      {contacts.length === 0 ? (
        <Card className="text-center text-sm text-muted">
          <p>No contacts yet.</p>
          <Link href="/friends/add" className="mt-2 inline-block text-primary">
            Add a friend by user ID
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <Link
              key={contact.friendshipId}
              href={
                contact.conversationId
                  ? `/chat/${contact.conversationId}`
                  : "/friends/add"
              }
            >
              <Card className="flex items-center justify-between hover:bg-[#1a2340]">
                <div>
                  <p className="font-medium">{contact.friend.display_name}</p>
                  <p className="text-sm text-muted">{contact.friend.public_id}</p>
                </div>
                <MessageCircle className="h-5 w-5 text-primary" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}