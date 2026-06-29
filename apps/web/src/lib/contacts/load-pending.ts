import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  IncomingPendingRequest,
  OutgoingPendingRequest,
} from "./pending-types";

interface IncomingRow {
  id: string;
  requester_id: string;
  requester: {
    display_name: string | null;
    public_id: string;
    avatar_url: string | null;
  };
}

interface OutgoingRow {
  id: string;
  addressee_id: string;
  addressee: {
    display_name: string | null;
    public_id: string;
    avatar_url: string | null;
  };
}

export async function loadIncomingPending(
  supabase: SupabaseClient,
  userId: string,
): Promise<IncomingPendingRequest[]> {
  const { data } = await supabase
    .from("friendships")
    .select(
      "id, requester_id, requester:profiles!friendships_requester_id_fkey(display_name, public_id, avatar_url)",
    )
    .eq("addressee_id", userId)
    .eq("status", "pending");

  return ((data as IncomingRow[] | null) ?? []).map((row) => ({
    friendshipId: row.id,
    peerId: row.requester_id,
    displayName: row.requester.display_name,
    publicId: row.requester.public_id,
    avatarUrl: row.requester.avatar_url,
  }));
}

export async function loadOutgoingPending(
  supabase: SupabaseClient,
  userId: string,
): Promise<OutgoingPendingRequest[]> {
  const { data } = await supabase
    .from("friendships")
    .select(
      "id, addressee_id, addressee:profiles!friendships_addressee_id_fkey(display_name, public_id, avatar_url)",
    )
    .eq("requester_id", userId)
    .eq("status", "pending");

  return ((data as OutgoingRow[] | null) ?? []).map((row) => ({
    friendshipId: row.id,
    peerId: row.addressee_id,
    displayName: row.addressee.display_name,
    publicId: row.addressee.public_id,
    avatarUrl: row.addressee.avatar_url,
  }));
}