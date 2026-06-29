import type { MessageType } from "@calling-app/core";
import {
  IMAGE_MESSAGE_PREVIEW,
  REMOVED_MESSAGE_LABEL,
} from "@/lib/chat/messages";
import type { Contact } from "@/lib/contacts/load-contacts";
import type { CallingAppVault, ConversationRow } from "@/lib/vault/schema";
import { getConversations } from "@/lib/vault/store";

export function previewForMessage(body: string, type: MessageType): string {
  if (type === "image") return IMAGE_MESSAGE_PREVIEW;
  return body;
}

export async function touchVaultConversation(
  vault: CallingAppVault,
  conversationId: string,
  preview: string,
  previewAt: string,
  unreadDelta = 0,
): Promise<void> {
  const existing = await vault.conversations.get(conversationId);
  const unreadCount = Math.max(0, (existing?.unreadCount ?? 0) + unreadDelta);

  await vault.conversations.put({
    id: conversationId,
    preview,
    previewAt,
    unreadCount,
    lastReadAt: existing?.lastReadAt ?? null,
  });
}

export function mergeVaultIntoContacts(
  contacts: Contact[],
  vaultRows: ConversationRow[],
): Contact[] {
  const byId = new Map(vaultRows.map((row) => [row.id, row]));

  return contacts.map((contact) => {
    if (!contact.conversationId) return contact;
    const vault = byId.get(contact.conversationId);
    if (!vault?.previewAt) return contact;

    const vaultTime = new Date(vault.previewAt).getTime();
    const contactTime = contact.lastMessageAt
      ? new Date(contact.lastMessageAt).getTime()
      : 0;

    if (vaultTime <= contactTime && contact.preview) return contact;

    return {
      ...contact,
      preview: vault.preview || contact.preview,
      lastMessageAt: vault.previewAt,
      unreadCount: Math.max(contact.unreadCount, vault.unreadCount),
    };
  });
}

export function sortContactsByActivity(contacts: Contact[]): Contact[] {
  return [...contacts].sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bTime - aTime;
  });
}

export function patchContactMessage(
  contacts: Contact[],
  conversationId: string,
  update: {
    preview: string;
    lastMessageAt: string;
    isActive: boolean;
    unreadCount?: number;
    unreadDelta?: number;
  },
): Contact[] {
  const next = contacts.map((contact) => {
    if (contact.conversationId !== conversationId) return contact;

    let unreadCount = contact.unreadCount;
    if (update.isActive) {
      unreadCount = 0;
    } else if (update.unreadCount !== undefined) {
      unreadCount = update.unreadCount;
    } else if (update.unreadDelta) {
      unreadCount = contact.unreadCount + update.unreadDelta;
    }

    return {
      ...contact,
      preview: update.preview,
      lastMessageAt: update.lastMessageAt,
      unreadCount,
    };
  });

  return sortContactsByActivity(next);
}

export async function clearVaultConversationUnread(
  vault: CallingAppVault,
  conversationId: string,
): Promise<void> {
  const existing = await vault.conversations.get(conversationId);
  if (!existing) return;

  await vault.conversations.put({
    ...existing,
    unreadCount: 0,
    lastReadAt: new Date().toISOString(),
  });
}

export async function hydrateContactsFromVault(
  vault: CallingAppVault,
  contacts: Contact[],
): Promise<Contact[]> {
  const rows = await getConversations();
  return sortContactsByActivity(mergeVaultIntoContacts(contacts, rows));
}

export async function recordVaultOutgoingMessage(
  vault: CallingAppVault,
  conversationId: string,
  body: string,
  type: MessageType,
  createdAt: string,
): Promise<void> {
  await touchVaultConversation(
    vault,
    conversationId,
    previewForMessage(body, type),
    createdAt,
    0,
  );
}

export async function recordVaultIncomingMessage(
  vault: CallingAppVault,
  conversationId: string,
  body: string,
  type: MessageType,
  createdAt: string,
  isActive: boolean,
): Promise<void> {
  await touchVaultConversation(
    vault,
    conversationId,
    previewForMessage(body, type),
    createdAt,
    isActive ? 0 : 1,
  );
}