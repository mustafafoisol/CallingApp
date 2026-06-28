"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface LookupProfile {
  id: string;
  public_id: string;
  display_name: string | null;
}

export function AddFriendForm() {
  const [publicId, setPublicId] = useState("");
  const [profile, setProfile] = useState<LookupProfile | null>(null);
  const [friendshipStatus, setFriendshipStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function lookup() {
    setLoading(true);
    setError(null);
    setMessage(null);
    setProfile(null);
    setFriendshipStatus(null);

    const res = await fetch(
      `/api/friends/lookup?publicId=${encodeURIComponent(publicId)}`,
    );
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Lookup failed");
      return;
    }

    setProfile(data.profile);
    setFriendshipStatus(data.friendship?.status ?? null);
  }

  async function sendRequest() {
    if (!profile) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/friends/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: profile.id }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Request failed");
      return;
    }

    setMessage("Friend request sent");
    setFriendshipStatus("pending");
  }

  return (
    <Card className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Friend&apos;s user ID</label>
        <div className="flex gap-2">
          <Input
            value={publicId}
            onChange={(e) => setPublicId(e.target.value.toUpperCase())}
            placeholder="CA7K9M2X"
          />
          <Button variant="secondary" onClick={lookup} disabled={loading}>
            Find
          </Button>
        </div>
      </div>

      {profile && (
        <div className="rounded-xl border border-border p-4">
          <p className="font-medium">{profile.display_name ?? "Unnamed user"}</p>
          <p className="text-sm text-muted">{profile.public_id}</p>
          {!friendshipStatus && (
            <Button className="mt-3" onClick={sendRequest} disabled={loading}>
              Send request
            </Button>
          )}
          {friendshipStatus && (
            <p className="mt-3 text-sm text-muted">Status: {friendshipStatus}</p>
          )}
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
      {message && <p className="text-sm text-accent">{message}</p>}
    </Card>
  );
}