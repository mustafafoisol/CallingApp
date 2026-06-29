"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { getOrCreateDeviceId } from "@/lib/device-id";
import { DEVICE_ID_COOKIE } from "@/lib/session/cookies";

export function LoginButton() {
  async function handleLogin() {
    const deviceId = getOrCreateDeviceId();
    document.cookie = `${DEVICE_ID_COOKIE}=${encodeURIComponent(deviceId)}; path=/; max-age=600; samesite=lax`;

    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?device_hint=${encodeURIComponent(deviceId)}`,
      },
    });
  }

  return (
    <Button className="w-full" size="lg" onClick={handleLogin}>
      Continue with Google
    </Button>
  );
}