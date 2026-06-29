import { NextResponse, type NextRequest } from "next/server";

import { authFailureFromExchangeError } from "@/lib/auth/callback-errors";
import {
  DEVICE_ID_COOKIE,
  SESSION_COOKIE_OPTIONS,
  SESSION_DEVICE_COOKIE,
  SESSION_VERSION_COOKIE,
} from "@/lib/session/cookies";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function authErrorRedirect(
  origin: string,
  detail: string,
): NextResponse {
  const url = new URL(`${origin}/login`);
  url.searchParams.set("error", "auth");
  url.searchParams.set("detail", detail);
  return NextResponse.redirect(url.toString());
}

async function ensureProfileRow(
  userId: string,
  db: Awaited<ReturnType<typeof createClient>>,
): Promise<boolean> {
  const { data: existing } = await db
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (existing) {
    return true;
  }

  const admin = createAdminClient();
  const insertClient = admin ?? db;
  const { error } = await insertClient
    .from("profiles")
    .upsert({ id: userId }, { onConflict: "id" });

  return !error;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/home";

  if (!code) {
    return authErrorRedirect(origin, "missing_code");
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return authErrorRedirect(
      origin,
      authFailureFromExchangeError(exchangeError.message),
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return authErrorRedirect(origin, "no_user");
  }

  const deviceHint = request.nextUrl.searchParams.get("device_hint");
  const deviceId =
    (deviceHint && deviceHint.length > 0
      ? deviceHint
      : request.cookies.get(DEVICE_ID_COOKIE)?.value) ?? crypto.randomUUID();
  const admin = createAdminClient();
  const db = admin ?? supabase;

  const profileReady = await ensureProfileRow(user.id, db);
  if (!profileReady) {
    await supabase.auth.signOut();
    return authErrorRedirect(origin, "profile_bind");
  }

  const { data: profile } = await db
    .from("profiles")
    .select("session_version, active_device_id, public_id, display_name")
    .eq("id", user.id)
    .maybeSingle();

  const isNewDevice = profile?.active_device_id !== deviceId;
  const sessionVersion = isNewDevice
    ? (profile?.session_version ?? 0) + 1
    : (profile?.session_version ?? 1);

  if (isNewDevice) {
    const { data: updatedProfile, error: updateError } = await db
      .from("profiles")
      .update({
        session_version: sessionVersion,
        active_device_id: deviceId,
        active_session_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select("id")
      .maybeSingle();

    if (updateError || !updatedProfile) {
      await supabase.auth.signOut();
      return authErrorRedirect(origin, "profile_bind");
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