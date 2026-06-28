import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, public_id, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <AppShell title="Settings">
      <SettingsForm
        displayName={profile?.display_name ?? ""}
        publicId={profile?.public_id ?? ""}
        avatarUrl={profile?.avatar_url ?? null}
      />
    </AppShell>
  );
}