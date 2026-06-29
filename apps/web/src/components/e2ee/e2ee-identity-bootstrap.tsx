"use client";

import { useEffect, useRef } from "react";

import { bootstrapE2eeForUser } from "@/lib/e2ee/bootstrap-client";
import { createClient } from "@/lib/supabase/client";

export function E2eeIdentityBootstrap() {
  const bootstrappedFor = useRef<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function runBootstrap(userId: string) {
      if (bootstrappedFor.current === userId) return;
      bootstrappedFor.current = userId;

      try {
        await bootstrapE2eeForUser(userId);
      } catch (error) {
        bootstrappedFor.current = null;
        console.error("[e2ee] identity bootstrap failed", error);
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "SIGNED_OUT") {
        bootstrappedFor.current = null;
        return;
      }
      if (!session?.user) return;
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        void runBootstrap(session.user.id);
      }
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled && session?.user) {
        void runBootstrap(session.user.id);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return null;
}