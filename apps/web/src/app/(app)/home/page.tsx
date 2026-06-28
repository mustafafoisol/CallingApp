import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ContactRow } from "@/components/contacts/contact-row";
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

      let preview: string | null = null;
      if (conversation?.id) {
        const { data: lastMsg } = await supabase
          .from("messages")
          .select("body")
          .eq("conversation_id", conversation.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        preview = lastMsg?.body ?? null;
      }

      return {
        friendshipId: friendship.id,
        friend,
        conversationId: conversation?.id ?? null,
        lastMessageAt: conversation?.last_message_at ?? null,
        preview,
      };
    }),
  );

  contacts.sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bTime - aTime;
  });

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[22px] font-bold tracking-tight text-[var(--chat-text)]">
            Messages
          </h2>
          <Link
            href="/friends/add"
            className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[var(--chat-coral)] text-white shadow-[0_2px_8px_rgba(242,107,82,0.35)]"
            aria-label="Add friend"
          >
            <Plus className="h-4 w-4" />
          </Link>
        </div>

        <div className="flex items-center gap-2 rounded-[11px] bg-[#F1E9E3] px-3.5 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-[#A8998F]" />
          <span className="text-sm text-[#A8998F]">Search conversations</span>
        </div>

        {contacts.length === 0 ? (
          <div className="rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-surface)] p-6 text-center text-sm text-[var(--chat-muted)]">
            <p>No contacts yet.</p>
            <Link
              href="/friends/add"
              className="mt-2 inline-block font-medium text-[var(--chat-coral)]"
            >
              Add a friend by user ID
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {contacts.map((contact, index) => (
              <ContactRow
                key={contact.friendshipId}
                href={
                  contact.conversationId
                    ? `/chat/${contact.conversationId}`
                    : "/friends/add"
                }
                name={contact.friend.display_name ?? "Friend"}
                preview={contact.preview}
                lastMessageAt={contact.lastMessageAt}
                active={index === 0 && !!contact.lastMessageAt}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}