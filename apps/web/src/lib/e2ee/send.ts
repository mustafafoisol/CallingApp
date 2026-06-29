import type { SupabaseClient } from "@supabase/supabase-js";
import { buildAad, decryptMessage, encryptMessage } from "@calling-app/core";

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
  const identity = await vault.device_identity.get(DEVICE_IDENTITY_KEY);
  if (!identity) throw new Error("Device identity key is missing");

  const ck = await ensureConversationKey(
    vault,
    supabase,
    conversationId,
    recipientId,
    identity.keyGeneration,
  );

  const aad = buildAad({
    conversationId,
    senderId,
    messageId,
    type: "text",
    senderKeyGeneration: identity.keyGeneration,
  });
  const plaintext = new TextEncoder().encode(body);
  const encrypted = await encryptMessage(ck, plaintext, aad);
  const verified = await decryptMessage(ck, encrypted.ciphertext, encrypted.nonce, aad);
  if (verified.length !== plaintext.length || !verified.every((b, i) => b === plaintext[i])) {
    throw new Error("Local encrypt verification failed");
  }
  const createdAt = new Date().toISOString();

  const { error } = await supabase.from("message_envelopes").insert({
    id: messageId,
    conversation_id: conversationId,
    sender_id: senderId,
    recipient_id: recipientId,
    type: "text",
    ciphertext: serializeBytea(encrypted.ciphertext),
    nonce: serializeBytea(encrypted.nonce),
    sender_key_generation: identity.keyGeneration,
    attachment_id: null,
  });
  if (error) throw error;

  await vault.messages.put({
    id: messageId,
    conversationId,
    senderId,
    body,
    type: "text",
    attachmentId: null,
    createdAt,
    removedAt: null,
  });

  return { envelopeId: messageId, createdAt };
}