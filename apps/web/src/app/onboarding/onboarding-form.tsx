"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function OnboardingForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [publicId, setPublicId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/profile/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to complete onboarding");
      return;
    }

    setPublicId(data.publicId);
    router.refresh();
  }

  if (publicId) {
    return (
      <Card className="space-y-4 text-center">
        <p className="text-sm text-muted">Your unique user ID</p>
        <p className="text-3xl font-bold tracking-widest text-primary">{publicId}</p>
        <p className="text-sm text-muted">
          Share this ID so friends can add you.
        </p>
        <Button className="w-full" onClick={() => router.push("/home")}>
          Go to Home
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="displayName" className="text-sm font-medium">
            Display name
          </label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Alex"
            minLength={2}
            maxLength={32}
            required
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? "Creating profile..." : "Create profile"}
        </Button>
      </form>
    </Card>
  );
}