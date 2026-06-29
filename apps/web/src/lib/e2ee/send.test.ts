import { describe, expect, it, vi } from "vitest";

import { sendEncryptedText } from "./send";

vi.mock("@calling-app/core", () => ({
  buildAad: vi.fn(() => new Uint8Array([1])),
  encryptMessage: vi.fn(async () => ({
    ciphertext: new Uint8Array([9, 9]),
    nonce: new Uint8Array([8]),
  })),
}));

vi.mock("./key-exchange", () => ({
  ensureConversationKey: vi.fn(async () => ({})),
}));

describe("sendEncryptedText", () => {
  it("inserts envelope without select returning (sender RLS)", async () => {
    const insert = vi.fn(async () => ({ error: null }));
    const supabase = {
      from: vi.fn(() => ({ insert })),
    };
    const vault = {
      device_identity: {
        get: vi.fn(async () => ({ keyGeneration: 1 })),
      },
      messages: {
        put: vi.fn(async () => undefined),
      },
    };

    const result = await sendEncryptedText(supabase as never, vault as never, {
      conversationId: "conv-1",
      recipientId: "recipient-1",
      senderId: "sender-1",
      messageId: "msg-1",
      body: "hello",
    });

    expect(insert).toHaveBeenCalledOnce();
    expect(insert.mock.calls[0]).toHaveLength(1);
    expect(result.envelopeId).toBe("msg-1");
    expect(result.createdAt).toBeTruthy();
  });
});