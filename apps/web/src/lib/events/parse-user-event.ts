import type { AddFriendEventPayload, UserEventRow } from "@calling-app/core";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

export function parseAddFriendPayload(value: unknown): AddFriendEventPayload | null {
  if (!isRecord(value)) return null;

  const friendshipId = readString(value, "friendship_id");
  const peerId = readString(value, "peer_id");
  const peerPublicId = readString(value, "peer_public_id");
  if (!friendshipId || !peerId || !peerPublicId) return null;

  const peerDisplayName = readString(value, "peer_display_name");
  const peerAvatarUrl = readString(value, "peer_avatar_url");
  const conversationId = readString(value, "conversation_id");

  return {
    friendship_id: friendshipId,
    peer_id: peerId,
    peer_display_name: peerDisplayName,
    peer_public_id: peerPublicId,
    peer_avatar_url: peerAvatarUrl,
    conversation_id: conversationId,
  };
}

export function parseUserEventRow(value: unknown): UserEventRow | null {
  if (!isRecord(value)) return null;

  const id = readString(value, "id");
  const recipientId = readString(value, "recipient_id");
  const eventType = readString(value, "event_type");
  const status = readString(value, "status");
  const createdAt = readString(value, "created_at");
  if (!id || !recipientId || !eventType || !status || !createdAt) return null;
  if (eventType !== "add-friend") return null;
  if (status !== "sent" && status !== "accepted" && status !== "ignored") return null;

  const payload = parseAddFriendPayload(value.payload);
  if (!payload) return null;

  return {
    id,
    recipient_id: recipientId,
    event_type: "add-friend",
    status,
    payload,
    created_at: createdAt,
  };
}