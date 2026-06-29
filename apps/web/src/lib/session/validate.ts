import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { clearSessionCookies } from "./cookies";

export type ProfileSession = {
  session_version: number;
  active_device_id: string | null;
  public_id?: string | null;
  display_name?: string | null;
};

export function sessionCookiesMatch(
  cookieSv: string | undefined,
  cookieDid: string | undefined,
  profile: ProfileSession | null | undefined,
): boolean {
  if (!cookieSv || !cookieDid || !profile?.active_device_id) {
    return false;
  }

  return (
    String(profile.session_version) === cookieSv &&
    profile.active_device_id === cookieDid
  );
}

export async function loadProfileSession(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileSession | null> {
  const { data } = await supabase
    .from("profiles")
    .select("session_version, active_device_id, public_id, display_name")
    .eq("id", userId)
    .single();

  return data;
}

export async function sessionReplacedRedirect(
  request: NextRequest,
  supabase: SupabaseClient,
): Promise<NextResponse> {
  await supabase.auth.signOut();
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("reason", "session_replaced");
  const response = NextResponse.redirect(url);
  clearSessionCookies((name, value, options) =>
    response.cookies.set(name, value, options),
  );
  return response;
}