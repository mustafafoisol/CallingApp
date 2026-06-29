import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { generateUniquePublicId } from "@/lib/profile";
import { persistOnboardingProfile } from "@/lib/profile/persist-onboarding";
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

  const saved = await persistOnboardingProfile(
    supabase,
    user.id,
    displayName,
    publicId,
  );

  if ("error" in saved) {
    return NextResponse.json({ error: saved.error }, { status: 500 });
  }

  const cookieStore = await cookies();
  const cookieSv = cookieStore.get(SESSION_VERSION_COOKIE)?.value;
  const cookieDid = cookieStore.get(SESSION_DEVICE_COOKIE)?.value;
  const deviceHint = cookieStore.get(DEVICE_ID_COOKIE)?.value;
  const deviceId =
    saved.data.active_device_id ?? deviceHint ?? crypto.randomUUID();
  const sessionVersion = saved.data.session_version ?? 1;

  if (!saved.data.active_device_id) {
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

  const response = NextResponse.json({ publicId: saved.data.public_id });
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