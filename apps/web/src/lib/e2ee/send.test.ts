import { describe, expect, it, vi } from "vitest";

import { deriveCkForMessage, fetchPeerCryptoKey } from "./key-exchange";
import { parseIdentityPubkey } from "./envelope";
import { sendEncryptedText } from "./send";

const RECIPIENT_PUBKEY_HEX = "ef".repeat(32);

vi.mock("@calling-app/core", () => ({
  buildAad: vi.fn(() => new Uint8Array([1])),
  encryptMessage: vi.fn(async () => ({
    ciphertext: new Uint8Array([9, 9]),
    nonce: new Uint8Array([8]),
  })),
}));

vi.mock("./key-exchange", () => ({
  fetchPeerCryptoKey: vi.fn(async () => ({
    identity_pubkey: `\\x${RECIPIENT_PUBKEY_HEX}`,
    key_generation: 1,
  })),
  deriveCkForMessage: vi.fn(async () => ({})),
}));

describe("sendEncryptedText", () => {
  it("inserts envelope with pubkey snapshot and static scheme", async () => {
    const insert = vi.fn(async () => ({ error: null }));
    const supabase = {
      from: vi.fn(() => ({ insert })),
    };
    const vault = {
      device_identity: {
        get: vi.fn(async () => ({
          keyGeneration: 1,
          identityPublicKey: new Uint8Array([1, 2, 3]),
        })),
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

    expect(fetchPeerCryptoKey).toHaveBeenCalledWith(supabase, "recipient-1");
    expect(deriveCkForMessage).toHaveBeenCalledWith(
      vault,
      "conv-1",
      parseIdentityPubkey(`\\x${RECIPIENT_PUBKEY_HEX}`),
      "static-v1",
      1,
    );
    expect(insert).toHaveBeenCalledOnce();
    expect(insert.mock.calls[0]?.[0]).toMatchObject({
      crypto_scheme: "static-v1",
      sender_pubkey: "\\x010203",
    });
    expect(result.envelopeId).toBe("msg-1");
  });
});