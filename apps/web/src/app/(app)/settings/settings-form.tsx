"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BlockedUsersPanel } from "@/components/friends/blocked-users-panel";
import { createClient } from "@/lib/supabase/client";

export function SettingsForm({
  displayName: initialName,
  publicId,
}: {
  displayName: string;
  publicId: string;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialName);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function saveProfile() {
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName }),
    });
    setLoading(false);
    setMessage(res.ok ? "Saved" : "Failed to save");
    router.refresh();
  }

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function copyId() {
    void navigator.clipboard.writeText(publicId);
    setMessage("User ID copied");
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Your user ID</label>
          <div className="flex gap-2">
            <Input value={publicId} readOnly />
            <Button variant="secondary" onClick={copyId}>
              Copy
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Display name</label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
        <Button onClick={saveProfile} disabled={loading}>
          Save changes
        </Button>
        {message && <p className="text-sm text-muted">{message}</p>}
      </Card>
      <BlockedUsersPanel />
      <Button variant="danger" className="w-full" onClick={logout}>
        Log out
      </Button>
    </div>
  );
}