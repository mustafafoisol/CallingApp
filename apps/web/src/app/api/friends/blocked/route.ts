import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: blocks, error } = await supabase
    .from("blocks")
    .select("id, blocked_id")
    .eq("blocker_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!blocks?.length) {
    return NextResponse.json({ blocks: [] });
  }

  const blockedIds = blocks.map((block) => block.blocked_id);
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, public_id, display_name, avatar_url")
    .in("id", blockedIds);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return NextResponse.json({
    blocks: blocks
      .map((block) => {
        const profile = profileById.get(block.blocked_id);
        if (!profile) return null;
        return { blockId: block.id, profile };
      })
      .filter(Boolean),
  });
}