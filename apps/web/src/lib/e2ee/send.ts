import type { SupabaseClient } from "@supabase/supabase-js";
import { buildAad, encryptMessage } from "@calling-app/core";

import { cacheAttachmentBlob } from "@/lib/chat/image-cache";
import { recordVaultOutgoingMessage } from "@/lib/contacts/vault-contact-sync";
import type { CallingAppVault } from "@/lib/vault/schema";
import { DEVICE_IDENTITY_KEY } from "@/lib/vault/schema";
import { fetchPeerCryptoKey, deriveCkForMessage } from "./key-exchange";
import {
  isMissingCryptoMetaColumn,
  parseIdentityPubkey,
  serializeBytea,
} from "./envelope";

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

export interface SendEncryptedImageParams {
  conversationId: string;
  recipientId: string;
  senderId: string;
  messageId: string;
  imageRef: string;
  localBlob: Blob;
}

export async function sendEncryptedText(
  supabase: SupabaseClient,
  vault: CallingAppVault,
  params: SendEncryptedTextParams,
): Promise<SendEncryptedTextResult> {
  const { conversationId, recipientId, senderId, messageId, body } = params;

  const identity = await vault.device_identity.get(DEVICE_IDENTITY_KEY);
  if (!identity) throw new Error("Device identity key is missing");

  const peer = await fetchPeerCryptoKey(supabase, recipientId);
  const recipientPubkey = parseIdentityPubkey(peer.identity_pubkey);
  if (!recipientPubkey) {
    throw new Error(`Peer ${recipientId} has an invalid published crypto key`);
  }
  const ck = await deriveCkForMessage(
    vault,
    conversationId,
    recipientPubkey,
    "static-v1",
    identity.keyGeneration,
  );

  const aad = buildAad({
    conversationId,
    senderId,
    messageId,
    type: "text",
    senderKeyGeneration: identity.keyGeneration,
  });
  const encrypted = await encryptMessage(ck, new TextEncoder().encode(body), aad);
  const createdAt = new Date().toISOString();

  const envelopeRow = {
    id: messageId,
    conversation_id: conversationId,
    sender_id: senderId,
    recipient_id: recipientId,
    type: "text" as const,
    ciphertext: serializeBytea(encrypted.ciphertext),
    nonce: serializeBytea(encrypted.nonce),
    sender_key_generation: identity.keyGeneration,
    sender_pubkey: serializeBytea(identity.identityPublicKey),
    crypto_scheme: "static-v1" as const,
    attachment_id: null,
  };

  let { error } = await supabase.from("message_envelopes").insert(envelopeRow);
  if (error && isMissingCryptoMetaColumn(error)) {
    const { sender_pubkey: _pk, crypto_scheme: _scheme, ...legacyRow } =
      envelopeRow;
    ({ error } = await supabase.from("message_envelopes").insert(legacyRow));
  }
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
    crypto: {
      scheme: "static-v1",
      senderKeyGeneration: identity.keyGeneration,
      senderPubkey: identity.identityPublicKey,
    },
  });

  await recordVaultOutgoingMessage(vault, conversationId, body, "text", createdAt);

  return { envelopeId: messageId, createdAt };
}

export async function sendEncryptedImage(
  supabase: SupabaseClient,
  vault: CallingAppVault,
  params: SendEncryptedImageParams,
): Promise<SendEncryptedTextResult> {
  const { conversationId, recipientId, senderId, messageId, imageRef, localBlob } =
    params;

  const identity = await vault.device_identity.get(DEVICE_IDENTITY_KEY);
  if (!identity) throw new Error("Device identity key is missing");

  const peer = await fetchPeerCryptoKey(supabase, recipientId);
  const recipientPubkey = parseIdentityPubkey(peer.identity_pubkey);
  if (!recipientPubkey) {
    throw new Error(`Peer ${recipientId} has an invalid published crypto key`);
  }
  const ck = await deriveCkForMessage(
    vault,
    conversationId,
    recipientPubkey,
    "static-v1",
    identity.keyGeneration,
  );

  const aad = buildAad({
    conversationId,
    senderId,
    messageId,
    type: "image",
    senderKeyGeneration: identity.keyGeneration,
  });
  const encrypted = await encryptMessage(
    ck,
    new TextEncoder().encode(imageRef),
    aad,
  );
  const createdAt = new Date().toISOString();

  const envelopeRow = {
    id: messageId,
    conversation_id: conversationId,
    sender_id: senderId,
    recipient_id: recipientId,
    type: "image" as const,
    ciphertext: serializeBytea(encrypted.ciphertext),
    nonce: serializeBytea(encrypted.nonce),
    sender_key_generation: identity.keyGeneration,
    sender_pubkey: serializeBytea(identity.identityPublicKey),
    crypto_scheme: "static-v1" as const,
    attachment_id: null,
  };

  let { error } = await supabase.from("message_envelopes").insert(envelopeRow);
  if (error && isMissingCryptoMetaColumn(error)) {
    const { sender_pubkey: _pk, crypto_scheme: _scheme, ...legacyRow } =
      envelopeRow;
    ({ error } = await supabase.from("message_envelopes").insert(legacyRow));
  }
  if (error) throw error;

  await vault.messages.put({
    id: messageId,
    conversationId,
    senderId,
    body: imageRef,
    type: "image",
    attachmentId: null,
    createdAt,
    removedAt: null,
    crypto: {
      scheme: "static-v1",
      senderKeyGeneration: identity.keyGeneration,
      senderPubkey: identity.identityPublicKey,
    },
  });

  await cacheAttachmentBlob(vault, messageId, conversationId, localBlob);
  await recordVaultOutgoingMessage(vault, conversationId, "", "image", createdAt);

  return { envelopeId: messageId, createdAt };
}