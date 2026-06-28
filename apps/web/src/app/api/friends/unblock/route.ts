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

  const { blockId, targetUserId } = await request.json();

  if (!blockId && !targetUserId) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  let query = supabase.from("blocks").delete().eq("blocker_id", user.id);

  if (blockId) {
    query = query.eq("id", blockId);
  } else {
    query = query.eq("blocked_id", targetUserId);
  }

  const { error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}