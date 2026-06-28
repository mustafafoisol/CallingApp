import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { friendshipId } = await request.json();

  if (!friendshipId) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { data: friendship } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status")
    .eq("id", friendshipId)
    .single();

  if (!friendship) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (
    friendship.requester_id !== user.id &&
    friendship.addressee_id !== user.id
  ) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  if (friendship.status !== "accepted") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", friendshipId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}