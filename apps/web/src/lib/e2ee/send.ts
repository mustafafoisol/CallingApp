import type { SupabaseClient } from "@supabase/supabase-js";
import { buildAad, encryptMessage } from "@calling-app/core";

import type { CallingAppVault } from "@/lib/vault/schema";
import { DEVICE_IDENTITY_KEY } from "@/lib/vault/schema";
import { serializeBytea } from "./envelope";
import { ensureConversationKey } from "./key-exchange";

export interface SendEncryptedTextParams {
  conversationId: string;
  recipientId: string;
  senderId: string;
  messageId: string;
  body: string;
}

export interface SendEncryptedTextResult {
  envelopeId: string;
  createdAt: string;
}

export async function sendEncryptedText(
  supabase: SupabaseClient,
  vault: CallingAppVault,
  params: SendEncryptedTextParams,
): Promise<SendEncryptedTextResult> {
  const { conversationId, recipientId, senderId, messageId, body } = params;
  const ck = await ensureConversationKey(vault, supabase, conversationId, recipientId);

  const identity = await vault.device_identity.get(DEVICE_IDENTITY_KEY);
  if (!identity) throw new Error("Device identity key is missing");

  const aad = buildAad({
    conversationId,
    senderId,
    messageId,
    type: "text",
    senderKeyGeneration: identity.keyGeneration,
  });
  const encrypted = await encryptMessage(ck, new TextEncoder().encode(body), aad);
  const createdAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("message_envelopes")
    .insert({
      id: messageId,
      conversation_id: conversationId,
      sender_id: senderId,
      recipient_id: recipientId,
      type: "text",
      ciphertext: serializeBytea(encrypted.ciphertext),
      nonce: serializeBytea(encrypted.nonce),
      sender_key_generation: identity.keyGeneration,
      attachment_id: null,
    })
    .select("id, created_at")
    .single();
  if (error) throw error;

  await vault.messages.put({
    id: messageId,
    conversationId,
    senderId,
    body,
    type: "text",
    attachmentId: null,
    createdAt: data.created_at ?? createdAt,
    removedAt: null,
  });

  return { envelopeId: data.id, createdAt: data.created_at ?? createdAt };
}