"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { createSessionListener } from "@/lib/session/listener";
import { handleSessionReplaced } from "@/lib/session/purge";
import { createClient } from "@/lib/supabase/client";

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

      unsubscribe = createSessionListener(supabase, user.id, () => {
        void handleSessionReplaced(user.id, supabase, router);
      });
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [router]);

  return <>{children}</>;
}