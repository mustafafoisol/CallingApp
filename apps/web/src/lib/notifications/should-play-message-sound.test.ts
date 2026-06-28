import { describe, expect, it } from "vitest";
import { shouldPlayMessageSound } from "./should-play-message-sound";

describe("shouldPlayMessageSound", () => {
  it("plays for incoming messages in non-active chats", () => {
    expect(
      shouldPlayMessageSound({
        senderId: "friend-1",
        currentUserId: "user-1",
        isActive: false,
        soundEnabled: true,
      }),
    ).toBe(true);
  });

  it("skips own messages", () => {
    expect(
      shouldPlayMessageSound({
        senderId: "user-1",
        currentUserId: "user-1",
        isActive: false,
        soundEnabled: true,
      }),
    ).toBe(false);
  });

  it("skips when the conversation is active", () => {
    expect(
      shouldPlayMessageSound({
        senderId: "friend-1",
        currentUserId: "user-1",
        isActive: true,
        soundEnabled: true,
      }),
    ).toBe(false);
  });

  it("skips when sound is disabled", () => {
    expect(
      shouldPlayMessageSound({
        senderId: "friend-1",
        currentUserId: "user-1",
        isActive: false,
        soundEnabled: false,
      }),
    ).toBe(false);
  });
});