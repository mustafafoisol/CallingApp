import { NextResponse, type NextRequest } from "next/server";

import {
  DEVICE_ID_COOKIE,
  SESSION_COOKIE_OPTIONS,
  SESSION_DEVICE_COOKIE,
  SESSION_VERSION_COOKIE,
} from "@/lib/session/cookies";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/home";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const deviceHint = request.nextUrl.searchParams.get("device_hint");
  const deviceId =
    (deviceHint && deviceHint.length > 0
      ? deviceHint
      : request.cookies.get(DEVICE_ID_COOKIE)?.value) ?? crypto.randomUUID();
  const admin = createAdminClient();
  const db = admin ?? supabase;

  const { data: profile } = await db
    .from("profiles")
    .select("session_version, active_device_id, public_id, display_name")
    .eq("id", user.id)
    .single();

  const isNewDevice = profile?.active_device_id !== deviceId;
  const sessionVersion = isNewDevice
    ? (profile?.session_version ?? 0) + 1
    : (profile?.session_version ?? 1);

  if (isNewDevice) {
    const { error: updateError } = await db
      .from("profiles")
      .update({
        session_version: sessionVersion,
        active_device_id: deviceId,
        active_session_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/login?error=auth`);
    }

    if (admin) {
      await admin.auth.admin.signOut(user.id, "others");
    }
  } else {
    await db
      .from("profiles")
      .update({ active_session_at: new Date().toISOString() })
      .eq("id", user.id);
  }

  const needsOnboarding = !profile?.public_id || !profile?.display_name;
  const destination = needsOnboarding ? "/onboarding" : next;
  const response = NextResponse.redirect(`${origin}${destination}`);
  response.cookies.set(
    SESSION_VERSION_COOKIE,
    String(sessionVersion),
    SESSION_COOKIE_OPTIONS,
  );
  response.cookies.set(SESSION_DEVICE_COOKIE, deviceId, SESSION_COOKIE_OPTIONS);
  response.cookies.delete(DEVICE_ID_COOKIE);

  return response;
}