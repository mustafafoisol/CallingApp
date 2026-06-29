import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";

export type SavedOnboardingProfile = {
  id: string;
  public_id: string;
  display_name: string;
  session_version: number;
  active_device_id: string | null;
};

export async function persistOnboardingProfile(
  supabase: SupabaseClient,
  userId: string,
  displayName: string,
  publicId: string,
): Promise<{ data: SavedOnboardingProfile } | { error: string }> {
  const payload = {
    id: userId,
    display_name: displayName,
    public_id: publicId,
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select("id, public_id, display_name, session_version, active_device_id")
    .single();

  if (!error && data?.public_id && data.display_name) {
    return { data };
  }

  const admin = createAdminClient();
  if (!admin) {
    return {
      error:
        error?.message ??
        "Profile was not saved. Ensure SUPABASE_SERVICE_ROLE_KEY is set in .env.local.",
    };
  }

  const { data: adminData, error: adminError } = await admin
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select("id, public_id, display_name, session_version, active_device_id")
    .single();

  if (adminError || !adminData?.public_id || !adminData.display_name) {
    return {
      error: adminError?.message ?? "Failed to save profile",
    };
  }

  return { data: adminData };
}