import type { SupabaseClient } from "@supabase/supabase-js";

import { getOrCreateDeviceId } from "../device-id";

type ProfileSessionRow = {
  active_device_id: string | null;
};

export function createSessionListener(
  supabase: SupabaseClient,
  userId: string,
  onReplaced: () => void,
): () => void {
  const localDeviceId = getOrCreateDeviceId();

  const channel = supabase
    .channel(`session:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "profiles",
        filter: `id=eq.${userId}`,
      },
      (payload) => {
        const activeDeviceId = (payload.new as ProfileSessionRow)
          .active_device_id;
        if (activeDeviceId && activeDeviceId !== localDeviceId) {
          onReplaced();
        }
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}