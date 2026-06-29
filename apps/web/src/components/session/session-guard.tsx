"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { setDeviceId } from "@/lib/device-id";
import { createSessionListener } from "@/lib/session/listener";
import { handleSessionReplaced } from "@/lib/session/purge";
import { createClient } from "@/lib/supabase/client";

type SessionResponse = {
  cookieDeviceId: string | null;
};

export function SessionGuard({ children }: { children: ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled || !user) return;

      const sessionRes = await fetch("/api/auth/session");
      const session = (await sessionRes.json()) as SessionResponse;

      if (cancelled) return;

      if (session.cookieDeviceId) {
        setDeviceId(session.cookieDeviceId);
        unsubscribe = createSessionListener(
          supabase,
          user.id,
          session.cookieDeviceId,
          () => {
            void handleSessionReplaced(user.id, supabase, router);
          },
        );
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [router]);

  return <>{children}</>;
}