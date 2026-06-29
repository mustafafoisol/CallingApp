import { describe, expect, it, vi } from "vitest";
import type { CallRecord } from "@calling-app/core";

import {
  acceptCall,
  createCall,
  endCall,
  rejectCall,
  subscribeToCall,
  writeAnswerSdp,
  writeOfferSdp,
} from "./signaling";

const CALLER = "11111111-1111-1111-1111-111111111111";
const CALLEE = "22222222-2222-2222-2222-222222222222";
const CALL_ID = "33333333-3333-3333-3333-333333333333";

const baseCall: CallRecord = {
  id: CALL_ID,
  conversation_id: "44444444-4444-4444-4444-444444444444",
  caller_id: CALLER,
  callee_id: CALLEE,
  kind: "voice",
  status: "ringing",
  offer_sdp: null,
  answer_sdp: null,
  started_at: null,
  ended_at: null,
  created_at: "2026-06-29T00:00:00.000Z",
};

function mockFrom(handlers: Record<string, () => unknown>) {
  return vi.fn((table: string) => {
    if (table !== "calls") throw new Error(`unexpected table ${table}`);
    return handlers;
  });
}

describe("call signaling", () => {
  it("creates a ringing call", async () => {
    const single = vi.fn(async () => ({ data: baseCall, error: null }));
    const supabase = { from: mockFrom({ insert: () => ({ select: () => ({ single }) }) }) };

    const call = await createCall(supabase as never, CALLER, {
      conversationId: baseCall.conversation_id,
      calleeId: CALLEE,
      kind: "voice",
    });

    expect(call.status).toBe("ringing");
    expect(single).toHaveBeenCalledOnce();
  });

  it("rejects invalid accept transitions", async () => {
    const single = vi.fn(async () => ({
      data: { ...baseCall, status: "ended" },
      error: null,
    }));
    const supabase = { from: mockFrom({ select: () => ({ eq: () => ({ single }) }) }) };

    await expect(acceptCall(supabase as never, CALL_ID, CALLEE)).rejects.toThrow(
      "Invalid call transition",
    );
  });

  it("accepts from ringing as callee", async () => {
    const getSingle = vi.fn(async () => ({ data: baseCall, error: null }));
    const patchSingle = vi.fn(async () => ({
      data: { ...baseCall, status: "accepted", started_at: "2026-06-29T00:01:00.000Z" },
      error: null,
    }));
    const supabase = {
      from: mockFrom({
        select: () => ({ eq: () => ({ single: getSingle }) }),
        update: () => ({ eq: () => ({ select: () => ({ single: patchSingle }) }) }),
      }),
    };

    const call = await acceptCall(supabase as never, CALL_ID, CALLEE);
    expect(call.status).toBe("accepted");
  });

  it("ends an accepted call for caller", async () => {
    const getSingle = vi.fn(async () => ({
      data: { ...baseCall, status: "accepted" },
      error: null,
    }));
    const patchSingle = vi.fn(async () => ({
      data: { ...baseCall, status: "ended", ended_at: "2026-06-29T00:02:00.000Z" },
      error: null,
    }));
    const supabase = {
      from: mockFrom({
        select: () => ({ eq: () => ({ single: getSingle }) }),
        update: () => ({ eq: () => ({ select: () => ({ single: patchSingle }) }) }),
      }),
    };

    const call = await endCall(supabase as never, CALL_ID, CALLER);
    expect(call.status).toBe("ended");
  });

  it("rejects callee writing offer SDP", async () => {
    const single = vi.fn(async () => ({ data: baseCall, error: null }));
    const supabase = { from: mockFrom({ select: () => ({ eq: () => ({ single }) }) }) };

    await expect(
      writeOfferSdp(supabase as never, CALL_ID, CALLEE, "offer"),
    ).rejects.toThrow("Only the caller can write offer SDP");
  });

  it("writes answer SDP as callee", async () => {
    const getSingle = vi.fn(async () => ({ data: baseCall, error: null }));
    const patchSingle = vi.fn(async () => ({
      data: { ...baseCall, answer_sdp: "answer" },
      error: null,
    }));
    const supabase = {
      from: mockFrom({
        select: () => ({ eq: () => ({ single: getSingle }) }),
        update: () => ({ eq: () => ({ select: () => ({ single: patchSingle }) }) }),
      }),
    };

    const call = await writeAnswerSdp(supabase as never, CALL_ID, CALLEE, "answer");
    expect(call.answer_sdp).toBe("answer");
  });

  it("subscribes to postgres and broadcast events", () => {
    const listeners: Array<(arg: unknown) => void> = [];
    const channel = {
      on: vi.fn((_type: string, filter: { event?: string }, cb: (arg: unknown) => void) => {
        listeners.push((arg) => {
          if (filter.event === "signal") {
            cb(arg);
            return;
          }
          cb(arg);
        });
        return channel;
      }),
      subscribe: vi.fn(() => channel),
    };
    const supabase = {
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(),
    };

    const onInsert = vi.fn();
    const onUpdate = vi.fn();
    const onBroadcast = vi.fn();
    const stop = subscribeToCall(supabase as never, CALL_ID, {
      onInsert,
      onUpdate,
      onBroadcast,
    });

    listeners[0]?.({ new: baseCall });
    listeners[1]?.({ new: { ...baseCall, status: "accepted" } });
    listeners[2]?.({ payload: { event: "ring", foo: 1 } });
    stop();

    expect(channel.on).toHaveBeenCalledTimes(3);
    expect(onInsert).toHaveBeenCalledWith(baseCall);
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: "accepted" }));
    expect(onBroadcast).toHaveBeenCalledWith("ring", { event: "ring", foo: 1 });
    expect(supabase.removeChannel).toHaveBeenCalledWith(channel);
  });

  it("rejects caller reject transition", async () => {
    const single = vi.fn(async () => ({ data: baseCall, error: null }));
    const supabase = { from: mockFrom({ select: () => ({ eq: () => ({ single }) }) }) };

    await expect(rejectCall(supabase as never, CALL_ID, CALLER)).rejects.toThrow(
      "Invalid call transition",
    );
  });
});