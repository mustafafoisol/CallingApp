"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatAvatar } from "@/components/chat/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BlockedUsersPanel } from "@/components/friends/blocked-users-panel";
import {
  AVATAR_ACCEPT,
  validateAvatarFileSize,
} from "@/lib/avatar-upload";
import { createClient } from "@/lib/supabase/client";

export function SettingsForm({
  displayName: initialName,
  publicId,
  avatarUrl: initialAvatarUrl,
}: {
  displayName: string;
  publicId: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

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

  async function uploadAvatar(file: File) {
    const sizeError = validateAvatarFileSize(file);
    if (sizeError) {
      setMessage(sizeError);
      return;
    }

    setAvatarLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/profile/avatar", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setAvatarLoading(false);

    if (!res.ok) {
      setMessage(data.error ?? "Failed to upload photo");
      return;
    }

    setAvatarUrl(data.avatarUrl);
    setMessage("Photo updated");
    router.refresh();
  }

  async function removeAvatar() {
    setAvatarLoading(true);
    setMessage(null);

    const res = await fetch("/api/profile/avatar", { method: "DELETE" });
    setAvatarLoading(false);

    if (!res.ok) {
      setMessage("Failed to remove photo");
      return;
    }

    setAvatarUrl(null);
    setMessage("Photo removed");
    router.refresh();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void uploadAvatar(file);
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
        <div className="flex items-center gap-4">
          <ChatAvatar
            name={displayName || publicId}
            imageUrl={avatarUrl}
            size="lg"
          />
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={AVATAR_ACCEPT}
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              variant="secondary"
              disabled={avatarLoading}
              onClick={() => fileInputRef.current?.click()}
            >
              Change photo
            </Button>
            {avatarUrl && (
              <Button
                variant="secondary"
                disabled={avatarLoading}
                onClick={() => void removeAvatar()}
              >
                Remove photo
              </Button>
            )}
            <p className="text-xs text-muted">JPEG, PNG, or WebP. Max 100 KB.</p>
          </div>
        </div>
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