import type { SupabaseClient } from "@supabase/supabase-js";
import { buildAad, decryptMessage } from "@calling-app/core";

import type { CallingAppVault } from "@/lib/vault/schema";
import { type MessageEnvelopeRow, toEncryptedEnvelope } from "./envelope";
import {
  ensureConversationKey,
  invalidateConversationKey,
  loadConversationKey,
  tryFetchPeerCryptoKey,
} from "./key-exchange";

export interface ProcessEnvelopeResult {
  messageId: string;
  body: string;
  createdAt: string;
  skipped: boolean;
}

const inflightEnvelopes = new Map<string, Promise<ProcessEnvelopeResult>>();

async function resolveConversationKey(
  vault: CallingAppVault,
  supabase: SupabaseClient,
  row: MessageEnvelopeRow,
): Promise<CryptoKey> {
  let ck = await loadConversationKey(
    vault,
    row.conversation_id,
    row.sender_key_generation,
  );
  if (!ck) {
    ck = await ensureConversationKey(
      vault,
      supabase,
      row.conversation_id,
      row.sender_id,
      row.sender_key_generation,
    );
  }
  return ck;
}

async function processEnvelopeOnce(
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
  if (senderKey && row.sender_key_generation < senderKey.key_generation) {
    await supabase.from("message_envelopes").delete().eq("id", row.id);
    return {
      messageId: row.id,
      body: "",
      createdAt: row.created_at,
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

  let ck = await resolveConversationKey(vault, supabase, row);
  let plaintext: Uint8Array;
  try {
    plaintext = await decryptMessage(ck, envelope.ciphertext, envelope.nonce, aad);
  } catch (firstError) {
    await invalidateConversationKey(
      vault,
      row.conversation_id,
      row.sender_key_generation,
    );
    ck = await ensureConversationKey(
      vault,
      supabase,
      row.conversation_id,
      row.sender_id,
      row.sender_key_generation,
    );
    try {
      plaintext = await decryptMessage(ck, envelope.ciphertext, envelope.nonce, aad);
    } catch {
      throw firstError;
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

export async function processEnvelope(
  supabase: SupabaseClient,
  vault: CallingAppVault,
  row: MessageEnvelopeRow,
): Promise<ProcessEnvelopeResult> {
  const inflight = inflightEnvelopes.get(row.id);
  if (inflight) return inflight;

  const task = processEnvelopeOnce(supabase, vault, row).finally(() => {
    inflightEnvelopes.delete(row.id);
  });
  inflightEnvelopes.set(row.id, task);
  return task;
}