import type { Profile } from "@calling-app/core";

export interface ContactRow {
  friendshipId: string;
  profile: Pick<Profile, "id" | "public_id" | "display_name">;
  conversationId: string | null;
}

export interface PendingRequestRow {
  friendshipId: string;
  profile: Pick<Profile, "id" | "public_id" | "display_name">;
  direction: "incoming" | "outgoing";
}