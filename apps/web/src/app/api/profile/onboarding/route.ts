import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { generateUniquePublicId } from "@/lib/profile";
import {
  DEVICE_ID_COOKIE,
  SESSION_COOKIE_OPTIONS,
  SESSION_DEVICE_COOKIE,
  SESSION_VERSION_COOKIE,
} from "@/lib/session/cookies";
import { sessionCookiesMatch } from "@/lib/session/validate";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const displayName = String(body.displayName ?? "").trim();

  if (displayName.length < 2 || displayName.length > 32) {
    return NextResponse.json(
      { error: "Display name must be 2-32 characters" },
      { status: 400 },
    );
  }

  const publicId = await generateUniquePublicId(async (id) => {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("public_id", id)
      .maybeSingle();
    return Boolean(data);
  });

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName, public_id: publicId })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: sessionProfile } = await supabase
    .from("profiles")
    .select("session_version, active_device_id")
    .eq("id", user.id)
    .single();

  const cookieStore = await cookies();
  const cookieSv = cookieStore.get(SESSION_VERSION_COOKIE)?.value;
  const cookieDid = cookieStore.get(SESSION_DEVICE_COOKIE)?.value;
  const deviceHint = cookieStore.get(DEVICE_ID_COOKIE)?.value;
  const deviceId =
    sessionProfile?.active_device_id ?? deviceHint ?? crypto.randomUUID();
  let sessionVersion = sessionProfile?.session_version ?? 1;

  if (!sessionProfile?.active_device_id) {
    const { error: bindError } = await supabase
      .from("profiles")
      .update({
        active_device_id: deviceId,
        session_version: sessionVersion,
        active_session_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (bindError) {
      return NextResponse.json({ error: bindError.message }, { status: 500 });
    }
  }

  const response = NextResponse.json({ publicId });
  if (
    !sessionCookiesMatch(cookieSv, cookieDid, {
      session_version: sessionVersion,
      active_device_id: deviceId,
    })
  ) {
    response.cookies.set(
      SESSION_VERSION_COOKIE,
      String(sessionVersion),
      SESSION_COOKIE_OPTIONS,
    );
    response.cookies.set(SESSION_DEVICE_COOKIE, deviceId, SESSION_COOKIE_OPTIONS);
    response.cookies.delete(DEVICE_ID_COOKIE);
  }

  return response;
}