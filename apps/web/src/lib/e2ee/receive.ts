import type { SupabaseClient } from "@supabase/supabase-js";
import { buildAad, decryptMessage } from "@calling-app/core";

import type { CallingAppVault } from "@/lib/vault/schema";
import { type MessageEnvelopeRow, toEncryptedEnvelope } from "./envelope";
import {
  ensureConversationKey,
  loadConversationKey,
  tryFetchPeerCryptoKey,
} from "./key-exchange";

export interface ProcessEnvelopeResult {
  messageId: string;
  body: string;
  createdAt: string;
  skipped: boolean;
}

export async function processEnvelope(
  supabase: SupabaseClient,
  vault: CallingAppVault,
  row: MessageEnvelopeRow,
): Promise<ProcessEnvelopeResult> {
  if (new Date(row.expires_at) <= new Date()) {
    return { messageId: row.id, body: "", createdAt: row.created_at, skipped: true };
  }

  const existing = await vault.messages.get(row.id);
  if (existing) {
    await supabase.from("message_envelopes").delete().eq("id", row.id);
    return {
      messageId: row.id,
      body: existing.body,
      createdAt: existing.createdAt,
      skipped: true,
    };
  }

  const senderKey = await tryFetchPeerCryptoKey(supabase, row.sender_id);
  if (
    senderKey &&
    row.sender_key_generation < senderKey.key_generation
  ) {
    await supabase.from("message_envelopes").delete().eq("id", row.id);
    return {
      messageId: row.id,
      body: "",
      createdAt: row.created_at,
      skipped: true,
    };
  }

  let ck = await loadConversationKey(vault, row.conversation_id, row.sender_key_generation);
  if (!ck) {
    ck = await ensureConversationKey(
      vault,
      supabase,
      row.conversation_id,
      row.sender_id,
      row.sender_key_generation,
    );
  }

  const aad = buildAad({
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    messageId: row.id,
    type: row.type,
    senderKeyGeneration: row.sender_key_generation,
  });
  const envelope = toEncryptedEnvelope(row);
  const plaintext = await decryptMessage(ck, envelope.ciphertext, envelope.nonce, aad);
  const body = new TextDecoder().decode(plaintext);
  const createdAt = row.created_at;

  await vault.messages.put({
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body,
    type: row.type,
    attachmentId: row.attachment_id,
    createdAt,
    removedAt: null,
  });

  const { error } = await supabase.from("message_envelopes").delete().eq("id", row.id);
  if (error) throw error;

  return { messageId: row.id, body, createdAt, skipped: false };
}