"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

interface PendingRequest {
  id: string;
  requester: {
    display_name: string | null;
    public_id: string;
  };
}

export function PendingRequests() {
  const [requests, setRequests] = useState<PendingRequest[]>([]);

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("friendships")
      .select("id, requester:profiles!friendships_requester_id_fkey(display_name, public_id)")
      .eq("addressee_id", user.id)
      .eq("status", "pending");

    setRequests((data as PendingRequest[] | null) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function respond(friendshipId: string, action: "accept" | "reject") {
    await fetch("/api/friends/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendshipId, action }),
    });
    await load();
  }

  if (requests.length === 0) return null;

  return (
    <Card className="space-y-3">
      <h2 className="font-medium">Pending requests</h2>
      {requests.map((req) => (
        <div
          key={req.id}
          className="flex items-center justify-between rounded-xl border border-border p-3"
        >
          <div>
            <p className="font-medium">{req.requester.display_name}</p>
            <p className="text-sm text-muted">{req.requester.public_id}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => respond(req.id, "accept")}>
              Accept
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => respond(req.id, "reject")}
            >
              Reject
            </Button>
          </div>
        </div>
      ))}
    </Card>
  );
}