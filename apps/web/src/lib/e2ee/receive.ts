import type { SupabaseClient } from "@supabase/supabase-js";
import { buildAad, decryptMessage } from "@calling-app/core";

import type { CallingAppVault } from "@/lib/vault/schema";
import {
  normalizeEnvelopeRow,
  type MessageEnvelopeRow,
  toEncryptedEnvelope,
} from "./envelope";
import {
  clearConversationKey,
  ensureConversationKey,
  loadConversationKey,
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
  rawRow: MessageEnvelopeRow | Record<string, unknown>,
): Promise<ProcessEnvelopeResult> {
  const row = normalizeEnvelopeRow(rawRow as Record<string, unknown>);

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

  const aad = buildAad({
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    messageId: row.id,
    type: row.type,
    senderKeyGeneration: row.sender_key_generation,
  });
  const envelope = toEncryptedEnvelope(row);

  async function deriveCk(force = false): Promise<CryptoKey> {
    if (!force) {
      const cached = await loadConversationKey(
        vault,
        row.conversation_id,
        row.sender_key_generation,
      );
      if (cached) return cached;
    } else {
      await clearConversationKey(vault, row.conversation_id, row.sender_key_generation);
    }
    return ensureConversationKey(
      vault,
      supabase,
      row.conversation_id,
      row.sender_id,
      row.sender_key_generation,
    );
  }

  let ck = await deriveCk();
  let plaintext: Uint8Array;
  try {
    plaintext = await decryptMessage(ck, envelope.ciphertext, envelope.nonce, aad);
  } catch (firstError) {
    ck = await deriveCk(true);
    try {
      plaintext = await decryptMessage(ck, envelope.ciphertext, envelope.nonce, aad);
    } catch {
      const detail = firstError instanceof Error ? firstError.message : "decrypt failed";
      throw new Error(
        `Decryption failed for envelope ${row.id} (sender_key_generation=${row.sender_key_generation}): ${detail}`,
      );
    }
  }
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