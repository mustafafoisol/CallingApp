import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  SESSION_DEVICE_COOKIE,
  SESSION_VERSION_COOKIE,
} from "@/lib/session/cookies";
import {
  loadProfileSession,
  sessionCookiesMatch,
  sessionReplacedRedirect,
} from "@/lib/session/validate";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Parameters<typeof supabaseResponse.cookies.set>[2];
          }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/auth");
  const isOnboarding = pathname.startsWith("/onboarding");
  const isProtected =
    pathname.startsWith("/home") ||
    pathname.startsWith("/chat") ||
    pathname.startsWith("/friends") ||
    pathname.startsWith("/settings");

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  let profile = null;
  if (user && !pathname.startsWith("/auth/callback")) {
    profile = await loadProfileSession(supabase, user.id);
    const cookieSv = request.cookies.get(SESSION_VERSION_COOKIE)?.value;
    const cookieDid = request.cookies.get(SESSION_DEVICE_COOKIE)?.value;
    if (!sessionCookiesMatch(cookieSv, cookieDid, profile)) {
      return sessionReplacedRedirect(request, supabase);
    }
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  if (user && isProtected) {
    const needsOnboarding = !profile?.public_id || !profile?.display_name;
    if (needsOnboarding && !isOnboarding) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }

    if (!needsOnboarding && isOnboarding) {
      const url = request.nextUrl.clone();
      url.pathname = "/home";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}