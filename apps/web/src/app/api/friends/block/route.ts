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

  const { error: blockError } = await supabase.from("blocks").upsert(
    { blocker_id: user.id, blocked_id: targetUserId },
    { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true },
  );

  if (blockError) {
    return NextResponse.json({ error: blockError.message }, { status: 500 });
  }

  const { error: friendshipError } = await supabase
    .from("friendships")
    .delete()
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${user.id})`,
    );

  if (friendshipError) {
    return NextResponse.json({ error: friendshipError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}