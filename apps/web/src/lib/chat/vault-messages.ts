import type { MessageRow } from "@/lib/chat/messages";
import type { VaultMessageRow } from "@/lib/vault/schema";
import { getMessages } from "@/lib/vault/store";

export function vaultRowToMessageRow(row: VaultMessageRow): MessageRow {
  const isImage = row.type === "image" && !row.removedAt;
  return {
    id: row.id,
    sender_id: row.senderId,
    body: isImage ? "" : row.removedAt ? "" : row.body,
    type: row.type,
    attachment_url: isImage ? row.body : null,
    created_at: row.createdAt,
    removed_at: row.removedAt,
  };
}

export async function loadVaultMessages(
  conversationId: string,
  limit: number,
): Promise<MessageRow[]> {
  const rows = await getMessages(conversationId, limit);
  return rows.map(vaultRowToMessageRow);
}

export async function loadOlderVaultMessages(
  conversationId: string,
  oldest: MessageRow,
  limit: number,
): Promise<MessageRow[]> {
  const rows = await getMessages(conversationId, limit, oldest.created_at);
  return rows.map(vaultRowToMessageRow);
}