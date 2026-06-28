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

  const { friendshipId, action } = await request.json();

  if (!friendshipId || !["accept", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { data: friendship } = await supabase
    .from("friendships")
    .select("id, addressee_id, status")
    .eq("id", friendshipId)
    .single();

  if (!friendship || friendship.addressee_id !== user.id) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  if (friendship.status !== "pending") {
    return NextResponse.json({ error: "Request already handled" }, { status: 409 });
  }

  const status = action === "accept" ? "accepted" : "blocked";

  const { error } = await supabase
    .from("friendships")
    .update({ status })
    .eq("id", friendshipId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status });
}