import type { MessageRow } from "./messages";

export type MessageStatus = "confirmed" | "pending" | "failed";

export interface ChatMessage extends MessageRow {
  status?: MessageStatus;
  clientId?: string;
}

export function createPendingMessage(
  clientId: string,
  senderId: string,
  body: string,
): ChatMessage {
  return {
    id: `pending-${clientId}`,
    sender_id: senderId,
    body,
    created_at: new Date().toISOString(),
    status: "pending",
    clientId,
  };
}

export function confirmPendingMessage(
  messages: ChatMessage[],
  clientId: string,
  confirmed: MessageRow,
): ChatMessage[] {
  if (messages.some((m) => m.id === confirmed.id)) {
    return messages.filter((m) => m.clientId !== clientId);
  }

  const index = messages.findIndex((m) => m.clientId === clientId);
  if (index === -1) {
    return [...messages, { ...confirmed, status: "confirmed" }];
  }

  const next = [...messages];
  next[index] = { ...confirmed, status: "confirmed" };
  return next;
}

export function reconcileIncomingMessage(
  messages: ChatMessage[],
  incoming: MessageRow,
  currentUserId: string,
): ChatMessage[] {
  if (messages.some((m) => m.id === incoming.id)) {
    return messages;
  }

  if (incoming.sender_id === currentUserId) {
    const pendingIndex = messages.findIndex(
      (m) => m.status === "pending" && m.body === incoming.body,
    );
    if (pendingIndex !== -1) {
      const next = [...messages];
      next[pendingIndex] = { ...incoming, status: "confirmed" };
      return next;
    }
  }

  return [...messages, { ...incoming, status: "confirmed" }];
}

export function markMessageFailed(
  messages: ChatMessage[],
  clientId: string,
): ChatMessage[] {
  return messages.map((m) =>
    m.clientId === clientId ? { ...m, status: "failed" } : m,
  );
}

export function removeMessageByClientId(
  messages: ChatMessage[],
  clientId: string,
): ChatMessage[] {
  return messages.filter((m) => m.clientId !== clientId);
}