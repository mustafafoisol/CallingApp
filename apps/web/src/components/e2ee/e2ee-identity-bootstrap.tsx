"use client";

import { useEffect } from "react";

import { bootstrapE2eeForUser } from "@/lib/e2ee/bootstrap-client";
import { createClient } from "@/lib/supabase/client";

export function E2eeIdentityBootstrap() {
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled || !user) return;

      try {
        await bootstrapE2eeForUser(user.id);
      } catch (error) {
        console.error("[e2ee] identity bootstrap failed", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}