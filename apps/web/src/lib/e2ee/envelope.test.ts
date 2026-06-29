import { describe, expect, it } from "vitest";

import { normalizeEnvelopeRow, parseBytea, serializeBytea } from "./envelope";

describe("parseBytea", () => {
  it("parses postgres hex bytea", () => {
    expect(parseBytea("\\x090a")).toEqual(new Uint8Array([9, 10]));
  });

  it("parses base64 bytea", () => {
    expect(parseBytea(btoa("\x09\x0a"))).toEqual(new Uint8Array([9, 10]));
  });

  it("parses Uint8Array passthrough", () => {
    const bytes = new Uint8Array([1, 2, 3]);
    expect(parseBytea(bytes)).toBe(bytes);
  });

  it("parses numeric arrays from realtime payloads", () => {
    expect(parseBytea([9, 10])).toEqual(new Uint8Array([9, 10]));
  });

  it("roundtrips serializeBytea", () => {
    const bytes = new Uint8Array([0, 255, 18]);
    expect(parseBytea(serializeBytea(bytes))).toEqual(bytes);
  });

  it("parses bare hex without postgres prefix", () => {
    expect(parseBytea("090a0b")).toEqual(new Uint8Array([9, 10, 11]));
  });
});

describe("normalizeEnvelopeRow", () => {
  it("coerces sender_key_generation and lowercases uuids", () => {
    const row = normalizeEnvelopeRow({
      id: "AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE",
      conversation_id: "bbbbbbbb-cccc-dddd-eeee-ffffffffffff",
      sender_id: "11111111-2222-3333-4444-555555555555",
      recipient_id: "22222222-3333-4444-5555-666666666666",
      type: "text",
      ciphertext: "ab12",
      nonce: "cd34",
      sender_key_generation: "2",
      attachment_id: null,
      created_at: "2026-06-28T00:00:00Z",
      expires_at: "2026-07-05T00:00:00Z",
    });

    expect(row.sender_key_generation).toBe(2);
    expect(row.id).toBe("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
  });
});