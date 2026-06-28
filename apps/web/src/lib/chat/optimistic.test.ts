import { describe, expect, it } from "vitest";
import {
  confirmPendingMessage,
  createPendingMessage,
  markMessageFailed,
  reconcileIncomingMessage,
  removeMessageByClientId,
} from "./optimistic";

describe("createPendingMessage", () => {
  it("creates a pending message with client id", () => {
    const pending = createPendingMessage("abc", "user-1", "Hello");
    expect(pending.id).toBe("pending-abc");
    expect(pending.status).toBe("pending");
    expect(pending.clientId).toBe("abc");
    expect(pending.body).toBe("Hello");
  });
});

describe("confirmPendingMessage", () => {
  it("replaces pending message with confirmed row", () => {
    const pending = createPendingMessage("abc", "user-1", "Hello");
    const confirmed = {
      id: "msg-1",
      sender_id: "user-1",
      body: "Hello",
      created_at: "2026-01-01T00:00:00.000Z",
    };

    const result = confirmPendingMessage([pending], "abc", confirmed);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("msg-1");
    expect(result[0].status).toBe("confirmed");
  });

  it("drops duplicate pending when confirmed id already exists", () => {
    const pending = createPendingMessage("abc", "user-1", "Hello");
    const confirmed = {
      id: "msg-1",
      sender_id: "user-1",
      body: "Hello",
      created_at: "2026-01-01T00:00:00.000Z",
    };

    const result = confirmPendingMessage(
      [{ ...confirmed, status: "confirmed" }, pending],
      "abc",
      confirmed,
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("msg-1");
  });
});

describe("reconcileIncomingMessage", () => {
  it("replaces oldest matching pending message from current user", () => {
    const pending = createPendingMessage("abc", "user-1", "Hello");
    const incoming = {
      id: "msg-1",
      sender_id: "user-1",
      body: "Hello",
      created_at: "2026-01-01T00:00:00.000Z",
    };

    const result = reconcileIncomingMessage([pending], incoming, "user-1");
    expect(result[0].id).toBe("msg-1");
    expect(result[0].status).toBe("confirmed");
  });

  it("appends messages from other users", () => {
    const incoming = {
      id: "msg-2",
      sender_id: "user-2",
      body: "Hi",
      created_at: "2026-01-01T00:00:00.000Z",
    };

    const result = reconcileIncomingMessage([], incoming, "user-1");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("msg-2");
  });
});

describe("markMessageFailed", () => {
  it("marks only the matching pending message as failed", () => {
    const pending = createPendingMessage("abc", "user-1", "Hello");
    const result = markMessageFailed([pending], "abc");
    expect(result[0].status).toBe("failed");
  });
});

describe("removeMessageByClientId", () => {
  it("removes the pending message", () => {
    const pending = createPendingMessage("abc", "user-1", "Hello");
    const result = removeMessageByClientId([pending], "abc");
    expect(result).toHaveLength(0);
  });
});