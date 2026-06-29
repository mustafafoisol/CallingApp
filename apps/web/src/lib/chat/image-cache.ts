import type { MessageRow } from "@/lib/chat/messages";
import type { CallingAppVault } from "@/lib/vault/schema";

export async function cacheAttachmentBlob(
  vault: CallingAppVault,
  messageId: string,
  conversationId: string,
  blob: Blob,
): Promise<void> {
  await vault.attachments_cache.put({
    attachmentId: messageId,
    conversationId,
    blob,
    cachedAt: Date.now(),
  });
}

export async function cacheAttachmentFromUrl(
  vault: CallingAppVault,
  messageId: string,
  conversationId: string,
  url: string,
): Promise<Blob> {
  const existing = await vault.attachments_cache.get(messageId);
  if (existing) return existing.blob;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image (${response.status})`);
  }

  const blob = await response.blob();
  await cacheAttachmentBlob(vault, messageId, conversationId, blob);
  return blob;
}

export async function resolveImageDisplayUrl(
  vault: CallingAppVault,
  messageId: string,
  conversationId: string,
  remoteUrl: string,
): Promise<string> {
  const cached = await vault.attachments_cache.get(messageId);
  if (cached) return URL.createObjectURL(cached.blob);

  const blob = await cacheAttachmentFromUrl(
    vault,
    messageId,
    conversationId,
    remoteUrl,
  );
  return URL.createObjectURL(blob);
}

export async function hydrateVaultImageMessages(
  vault: CallingAppVault,
  conversationId: string,
  messages: MessageRow[],
): Promise<MessageRow[]> {
  return Promise.all(
    messages.map(async (message) => {
      if (message.type !== "image" || !message.attachment_url) return message;
      try {
        const displayUrl = await resolveImageDisplayUrl(
          vault,
          message.id,
          conversationId,
          message.attachment_url,
        );
        return { ...message, attachment_url: displayUrl };
      } catch (error) {
        console.error("[image-cache] hydrate failed", message.id, error);
        return message;
      }
    }),
  );
}