import type { SupabaseClient } from "@supabase/supabase-js";
import { buildAad, decryptMessage } from "@calling-app/core";

import type { CallingAppVault } from "@/lib/vault/schema";
import {
  parseBytea,
  parseIdentityPubkey,
  type CryptoScheme,
  type MessageCryptoMeta,
  type MessageEnvelopeRow,
  toEncryptedEnvelope,
} from "./envelope";
import { deriveCkForMessage, tryFetchPeerCryptoKey } from "./key-exchange";

export interface ProcessEnvelopeResult {
  messageId: string;
  body: string;
  createdAt: string;
  skipped: boolean;
}

const inflightEnvelopes = new Map<string, Promise<ProcessEnvelopeResult>>();

function schemesToTry(primary: CryptoScheme): CryptoScheme[] {
  if (primary === "static-v1") return ["static-v1", "gen-v1"];
  return ["gen-v1", "static-v1"];
}

async function resolveSenderPubkey(
  supabase: SupabaseClient,
  row: MessageEnvelopeRow,
): Promise<Uint8Array> {
  const snapshot = parseIdentityPubkey(row.sender_pubkey);
  if (snapshot) return snapshot;

  const senderKey = await tryFetchPeerCryptoKey(supabase, row.sender_id);
  if (!senderKey) {
    throw new Error(`Sender ${row.sender_id} has no published crypto key`);
  }
  const live = parseIdentityPubkey(senderKey.identity_pubkey);
  if (!live) {
    throw new Error(`Sender ${row.sender_id} has an invalid published crypto key`);
  }
  return live;
}

async function decryptEnvelope(
  vault: CallingAppVault,
  supabase: SupabaseClient,
  row: MessageEnvelopeRow,
): Promise<{ body: string; crypto: MessageCryptoMeta }> {
  const peerPubkey = await resolveSenderPubkey(supabase, row);
  const primaryScheme = row.crypto_scheme ?? "gen-v1";
  const aad = buildAad({
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    messageId: row.id,
    type: row.type,
    senderKeyGeneration: row.sender_key_generation,
  });
  const envelope = toEncryptedEnvelope(row);

  let lastDecryptError: unknown;
  for (const scheme of schemesToTry(primaryScheme)) {
    const ck = await deriveCkForMessage(
      vault,
      row.conversation_id,
      peerPubkey,
      scheme,
      row.sender_key_generation,
    );
    try {
      const plaintext = await decryptMessage(
        ck,
        envelope.ciphertext,
        envelope.nonce,
        aad,
      );
      return {
        body: new TextDecoder().decode(plaintext),
        crypto: {
          scheme,
          senderKeyGeneration: row.sender_key_generation,
          senderPubkey: peerPubkey,
        },
      };
    } catch (error) {
      lastDecryptError = error;
    }
  }

  throw lastDecryptError;
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

  const { body, crypto } = await decryptEnvelope(vault, supabase, row);
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
    crypto,
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