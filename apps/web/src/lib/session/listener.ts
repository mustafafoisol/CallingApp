import type { SupabaseClient } from "@supabase/supabase-js";

export function createSessionListener(
  supabase: SupabaseClient,
  userId: string,
  onReplaced: () => void,
): () => void {
  // TODO(Task 03.4): subscribe to profiles UPDATE via Realtime for `userId`
  // When `active_device_id` !== local device_id, call `onReplaced()`
  void supabase;
  void userId;
  void onReplaced;

  return () => {
    // TODO: unsubscribe from Realtime channel
  };
}