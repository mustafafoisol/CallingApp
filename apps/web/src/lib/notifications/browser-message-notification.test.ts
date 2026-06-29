import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  maybeShowFriendAcceptedNotification,
  maybeShowMessageNotification,
  showMessageNotification,
} from "./browser-message-notification";

let createdNotifications: Array<{ title: string; options: NotificationOptions }> = [];
let visibilityState: DocumentVisibilityState = "hidden";

class MockNotification {
  static permission: NotificationPermission = "granted";
  static requestPermission = vi.fn(async () => "granted" as NotificationPermission);

  onclick: (() => void) | null = null;

  constructor(title: string, options?: NotificationOptions) {
    createdNotifications.push({ title, options: options ?? {} });
  }

  close() {}
}

describe("browser message notifications", () => {
  beforeEach(() => {
    createdNotifications = [];
    visibilityState = "hidden";
    vi.stubGlobal("Notification", MockNotification);
    vi.stubGlobal("document", {
      visibilityState,
    });
    vi.stubGlobal("window", {
      Notification: MockNotification,
      localStorage: {
        store: new Map<string, string>(),
        getItem(key: string) {
          return this.store.get(key) ?? null;
        },
        setItem(key: string, value: string) {
          this.store.set(key, value);
        },
        clear() {
          this.store.clear();
        },
      },
      focus: vi.fn(),
      location: { assign: vi.fn() },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a notification when the tab is hidden and permission is granted", () => {
    showMessageNotification({
      messageId: "msg-1",
      title: "Alex",
      body: "Hello",
      iconUrl: null,
      chatUrl: "/chat/conv-1",
    });

    expect(createdNotifications).toHaveLength(1);
    expect(createdNotifications[0]?.title).toBe("Alex");
    expect(createdNotifications[0]?.options.body).toBe("Hello");
  });

  it("does not show when the tab is visible", () => {
    vi.stubGlobal("document", { visibilityState: "visible" });

    maybeShowMessageNotification({
      messageId: "msg-1",
      conversationId: "conv-1",
      senderName: "Alex",
      body: "Hello",
      iconUrl: null,
      chatUrl: "/chat/conv-1",
    });

    expect(createdNotifications).toHaveLength(0);
  });

  it("does not show when browser notifications are disabled", () => {
    window.localStorage.setItem("callingapp:browserNotifications", "0");

    maybeShowMessageNotification({
      messageId: "msg-1",
      conversationId: "conv-1",
      senderName: "Alex",
      body: "Hello",
      iconUrl: null,
      chatUrl: "/chat/conv-1",
    });

    expect(createdNotifications).toHaveLength(0);
  });

  it("shows a friend-accepted notification when the tab is hidden", () => {
    maybeShowFriendAcceptedNotification({
      friendshipId: "friend-1",
      friendName: "Alex",
      iconUrl: null,
      chatUrl: "/chat/conv-1",
    });

    expect(createdNotifications).toHaveLength(1);
    expect(createdNotifications[0]?.title).toBe("Alex");
    expect(createdNotifications[0]?.options.body).toBe(
      "Accepted your friend request",
    );
    expect(createdNotifications[0]?.options.tag).toBe("friend-accepted-friend-1");
  });
});