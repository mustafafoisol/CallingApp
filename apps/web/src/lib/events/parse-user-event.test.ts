import { describe, expect, it } from "vitest";
import { parseUserEventRow } from "./parse-user-event";

describe("parseUserEventRow", () => {
  it("parses add-friend sent events", () => {
    const event = parseUserEventRow({
      id: "evt-1",
      recipient_id: "user-b",
      event_type: "add-friend",
      status: "sent",
      created_at: "2026-06-29T00:00:00.000Z",
      payload: {
        friendship_id: "friend-1",
        peer_id: "user-a",
        peer_display_name: "Alex",
        peer_public_id: "CA7K9M2X",
        peer_avatar_url: null,
      },
    });

    expect(event?.status).toBe("sent");
    expect(event?.payload.peer_id).toBe("user-a");
  });

  it("parses add-friend accepted events with conversation id", () => {
    const event = parseUserEventRow({
      id: "evt-2",
      recipient_id: "user-a",
      event_type: "add-friend",
      status: "accepted",
      created_at: "2026-06-29T00:00:00.000Z",
      payload: {
        friendship_id: "friend-1",
        peer_id: "user-b",
        peer_display_name: "Blake",
        peer_public_id: "CA8K9M3X",
        peer_avatar_url: null,
        conversation_id: "conv-1",
      },
    });

    expect(event?.status).toBe("accepted");
    expect(event?.payload.conversation_id).toBe("conv-1");
  });
});