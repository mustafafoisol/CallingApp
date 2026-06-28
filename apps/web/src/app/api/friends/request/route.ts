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

  const { targetUserId } = await request.json();

  if (!targetUserId || targetUserId === user.id) {
    return NextResponse.json({ error: "Invalid target user" }, { status: 400 });
  }

  const [{ data: blockedByTarget }, { data: blockedByMe }] = await Promise.all([
    supabase.rpc("is_blocked_by", { blocker: targetUserId, blocked: user.id }),
    supabase.rpc("is_blocked_by", { blocker: user.id, blocked: targetUserId }),
  ]);

  if (blockedByTarget) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (blockedByMe) {
    return NextResponse.json(
      { error: "Unblock this user first" },
      { status: 400 },
    );
  }

  const { data: existing } = await supabase
    .from("friendships")
    .select("id, status")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${user.id})`,
    )
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: `Friendship already ${existing.status}` },
      { status: 409 },
    );
  }

  const { data, error } = await supabase
    .from("friendships")
    .insert({
      requester_id: user.id,
      addressee_id: targetUserId,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ friendshipId: data.id });
}