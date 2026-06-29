import type { SupabaseClient } from "@supabase/supabase-js";

import type { MessageRow } from "@/lib/chat/messages";
import type { CallingAppVault } from "@/lib/vault/schema";

const CHAT_MEDIA_BUCKET = "chat-media";

function isHttpUrl(ref: string): boolean {
  return ref.startsWith("http://") || ref.startsWith("https://");
}

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

export async function cacheAttachmentFromRef(
  supabase: SupabaseClient,
  vault: CallingAppVault,
  messageId: string,
  conversationId: string,
  ref: string,
): Promise<Blob> {
  const existing = await vault.attachments_cache.get(messageId);
  if (existing) return existing.blob;

  let blob: Blob;
  if (isHttpUrl(ref)) {
    const response = await fetch(ref);
    if (!response.ok) {
      throw new Error(`Failed to fetch image (${response.status})`);
    }
    blob = await response.blob();
  } else {
    const { data, error } = await supabase.storage
      .from(CHAT_MEDIA_BUCKET)
      .download(ref);
    if (error || !data) {
      throw new Error(error?.message ?? "Failed to download image");
    }
    blob = data;
  }

  await cacheAttachmentBlob(vault, messageId, conversationId, blob);
  return blob;
}

export async function resolveImageDisplayUrl(
  supabase: SupabaseClient,
  vault: CallingAppVault,
  messageId: string,
  conversationId: string,
  ref: string,
): Promise<string> {
  const cached = await vault.attachments_cache.get(messageId);
  if (cached) return URL.createObjectURL(cached.blob);

  const blob = await cacheAttachmentFromRef(
    supabase,
    vault,
    messageId,
    conversationId,
    ref,
  );
  return URL.createObjectURL(blob);
}

export async function hydrateVaultImageMessages(
  supabase: SupabaseClient,
  vault: CallingAppVault,
  conversationId: string,
  messages: MessageRow[],
): Promise<MessageRow[]> {
  return Promise.all(
    messages.map(async (message) => {
      if (message.type !== "image" || !message.attachment_url) return message;
      try {
        const displayUrl = await resolveImageDisplayUrl(
          supabase,
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