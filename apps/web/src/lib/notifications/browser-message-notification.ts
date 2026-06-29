import { isBrowserNotificationsEnabled } from "./notification-prefs";

const DEFAULT_ICON = "/icon-192.png";

type NavigateHandler = (chatUrl: string) => void;

let navigateHandler: NavigateHandler | null = null;

export function setNotificationNavigationHandler(handler: NavigateHandler | null) {
  navigateHandler = handler;
}

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function isTabHidden(): boolean {
  return typeof document !== "undefined" && document.visibilityState === "hidden";
}

export function maybeShowMessageNotification({
  messageId,
  senderName,
  body,
  iconUrl,
  chatUrl,
}: {
  messageId: string;
  conversationId: string;
  senderName: string;
  body: string;
  iconUrl: string | null;
  chatUrl: string;
}): void {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== "granted") return;
  if (!isBrowserNotificationsEnabled()) return;
  if (!isTabHidden()) return;

  showMessageNotification({
    messageId,
    title: senderName,
    body,
    iconUrl,
    chatUrl,
  });
}

export function showMessageNotification({
  messageId,
  title,
  body,
  iconUrl,
  chatUrl,
  tagPrefix = "message",
}: {
  messageId: string;
  title: string;
  body: string;
  iconUrl: string | null;
  chatUrl: string;
  tagPrefix?: string;
}): void {
  if (!isNotificationSupported()) return;

  const notification = new Notification(title, {
    body,
    icon: iconUrl ?? DEFAULT_ICON,
    badge: DEFAULT_ICON,
    tag: `${tagPrefix}-${messageId}`,
    data: { url: chatUrl },
  });

  notification.onclick = () => {
    window.focus();
    if (navigateHandler) {
      navigateHandler(chatUrl);
    } else {
      window.location.assign(chatUrl);
    }
    notification.close();
  };
}

export function maybeShowFriendAcceptedNotification({
  friendshipId,
  friendName,
  iconUrl,
  chatUrl,
}: {
  friendshipId: string;
  friendName: string;
  iconUrl: string | null;
  chatUrl: string;
}): void {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== "granted") return;
  if (!isBrowserNotificationsEnabled()) return;
  if (!isTabHidden()) return;

  showMessageNotification({
    messageId: friendshipId,
    title: friendName,
    body: "Accepted your friend request",
    iconUrl,
    chatUrl,
    tagPrefix: "friend-accepted",
  });
}