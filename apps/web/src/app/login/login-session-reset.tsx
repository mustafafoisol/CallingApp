"use client";

import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";

export function LoginSessionReset({ shouldReset }: { shouldReset: boolean }) {
  useEffect(() => {
    if (!shouldReset) return;

    const supabase = createClient();
    void supabase.auth.signOut();
  }, [shouldReset]);

  return null;
}