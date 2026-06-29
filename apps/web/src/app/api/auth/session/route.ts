import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  SESSION_DEVICE_COOKIE,
  SESSION_VERSION_COOKIE,
} from "@/lib/session/cookies";
import { sessionCookiesMatch } from "@/lib/session/validate";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({
      valid: false,
      sessionVersion: null,
      deviceId: null,
    });
  }

  const cookieStore = await cookies();
  const cookieSv = cookieStore.get(SESSION_VERSION_COOKIE)?.value;
  const cookieDid = cookieStore.get(SESSION_DEVICE_COOKIE)?.value;

  const { data: profile } = await supabase
    .from("profiles")
    .select("session_version, active_device_id")
    .eq("id", user.id)
    .single();

  const valid = sessionCookiesMatch(cookieSv, cookieDid, profile);

  return NextResponse.json({
    valid,
    sessionVersion: profile?.session_version ?? null,
    deviceId: profile?.active_device_id ?? null,
    cookieDeviceId: cookieDid ?? null,
  });
}