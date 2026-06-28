import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json({ ok: true, skipped: "missing supabase env" });
  }

  // Presence is off — ping DB only; never update profiles.last_seen_at.
  const supabase = createClient(url, key);
  const { error } = await supabase.from("profiles").select("id").limit(1);

  return NextResponse.json({ ok: !error, error: error?.message ?? null });
}