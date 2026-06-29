"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { getOrCreateDeviceId } from "@/lib/device-id";
import { DEVICE_ID_COOKIE } from "@/lib/session/cookies";

function getOAuthRedirectOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export function LoginButton() {
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (loading) return;

    setLoading(true);

    try {
      const supabase = createClient();
      await supabase.auth.signOut();

      const deviceId = getOrCreateDeviceId();
      document.cookie = `${DEVICE_ID_COOKIE}=${encodeURIComponent(deviceId)}; path=/; max-age=600; samesite=lax`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${getOAuthRedirectOrigin()}/auth/callback?device_hint=${encodeURIComponent(deviceId)}`,
        },
      });

      if (error) {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }

  return (
    <Button
      className="w-full"
      size="lg"
      onClick={handleLogin}
      disabled={loading}
    >
      {loading ? "Redirecting to Google..." : "Continue with Google"}
    </Button>
  );
}