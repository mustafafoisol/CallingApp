import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidPublicId, normalizePublicId } from "@/lib/profile";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const publicId = normalizePublicId(
    new URL(request.url).searchParams.get("publicId") ?? "",
  );

  if (!isValidPublicId(publicId)) {
    return NextResponse.json({ error: "Invalid user ID format" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, public_id, display_name, avatar_url")
    .eq("public_id", publicId)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (profile.id === user.id) {
    return NextResponse.json({ error: "Cannot add yourself" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("friendships")
    .select("id, status")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${profile.id}),and(requester_id.eq.${profile.id},addressee_id.eq.${user.id})`,
    )
    .maybeSingle();

  return NextResponse.json({ profile, friendship: existing ?? null });
}