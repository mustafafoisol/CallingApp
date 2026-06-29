import type { SupabaseClient } from "@supabase/supabase-js";

type ProfileSessionRow = {
  active_device_id: string | null;
};

export function createSessionListener(
  supabase: SupabaseClient,
  userId: string,
  authorizedDeviceId: string,
  onReplaced: () => void,
): () => void {
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
        if (activeDeviceId && activeDeviceId !== authorizedDeviceId) {
          onReplaced();
        }
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}