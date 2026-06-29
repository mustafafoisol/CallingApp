"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { dayKey, formatDayLabel } from "@/lib/chat/format-time";
import {
  INITIAL_MESSAGE_LIMIT,
  OLDER_MESSAGE_PAGE_SIZE,
  type MessageRow,
} from "@/lib/chat/messages";
import {
  loadOlderVaultMessages,
  loadVaultMessages,
} from "@/lib/chat/vault-messages";
import { ensureDeviceIdentity } from "@/lib/e2ee/bootstrap";
import { catchUpEnvelopes } from "@/lib/e2ee/catch-up";
import { type MessageEnvelopeRow } from "@/lib/e2ee/envelope";
import { listEnvelopesForRecipient } from "@/lib/e2ee/envelope-query";
import { ensurePeerKeyAvailable } from "@/lib/e2ee/peer-key-sync";
import {
  hydrateVaultImageMessages,
  resolveImageDisplayUrl,
} from "@/lib/chat/image-cache";
import { processEnvelope } from "@/lib/e2ee/receive";
import { sendEncryptedImage, sendEncryptedText } from "@/lib/e2ee/send";
import { openVault } from "@/lib/vault/store";
import {
  compressImageForChat,
  ImageCompressionError,
} from "@/lib/chat/compress-image";
import {
  confirmPendingMessage,
  createPendingImageMessage,
  createPendingMessage,
  markMessageFailed,
  mergeLoadedVaultMessages,
  reconcileIncomingMessage,
  type ChatMessage,
} from "@/lib/chat/optimistic";
import { uploadChatImage } from "@/lib/chat/upload-image";
import { ChatAvatar } from "@/components/chat/avatar";
import { ChatHeader } from "@/components/chat/chat-header";
import { ComposeBar } from "@/components/chat/compose-bar";
import { MessageActionsMenu } from "@/components/chat/message-actions-menu";
import { LinkPreviewDialog } from "@/components/chat/link-preview-dialog";
import { MessageBubble } from "@/components/chat/message-bubble";
import { hideMessage } from "@/lib/chat/hide-message";
import { removeMessage } from "@/lib/chat/remove-message";
import { subscribeToConversationEnvelopes } from "@/lib/chat/envelope-realtime";
import { markConversationRead } from "@/lib/contacts/mark-conversation-read";
import { clearVaultConversationUnread } from "@/lib/contacts/vault-contact-sync";
import { cn } from "@/lib/utils";
import { useCall } from "@/contexts/call-context";
import { useContactsContext } from "@/contexts/contacts-context";
import { isVoiceCallsEnabled } from "@/lib/call/feature-flag";

function formatVaultError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const message = (err as { message: unknown }).message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return "Could not open encrypted chat.";
}

export function ChatView({
  conversationId,
  currentUserId,
  friendId,
  friendshipId,
  friendName,
  canMessage = true,
  friendAvatarUrl,
  initialMessages = [],
  initialHiddenMessageIds = [],
}: {
  conversationId: string;
  currentUserId: string;
  friendId: string;
  friendshipId?: string | null;
  friendName: string;
  canMessage?: boolean;
  friendAvatarUrl?: string | null;
  initialMessages?: MessageRow[];
  initialHiddenMessageIds?: string[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialMessages.map((message) => ({ ...message, status: "confirmed" })),
  );
  const [vaultReady, setVaultReady] = useState(false);
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<string>("connecting");
  const [hasMore, setHasMore] = useState(
    initialMessages.length >= INITIAL_MESSAGE_LIMIT,
  );
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loadOlderError, setLoadOlderError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { startCall, uiState, error: callError, clearCallError } = useCall();
  const { notifyLocalMessage } = useContactsContext();
  const [sendingImage, setSendingImage] = useState(false);
  const [linkPreviewUrl, setLinkPreviewUrl] = useState<string | null>(null);
  const [openActionsMessageId, setOpenActionsMessageId] = useState<
    string | null
  >(null);
  const hiddenMessageIdsRef = useRef(new Set(initialHiddenMessageIds));
  const pendingImageFilesRef = useRef(new Map<string, File>());
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollToBottomRef = useRef(false);
  const pendingScrollRestore = useRef<{ height: number; top: number } | null>(
    null,
  );
  const vaultInitializedRef = useRef(false);
  const activeConversationRef = useRef(conversationId);
  const handleEnvelopeRef = useRef<
    (row: MessageEnvelopeRow) => Promise<void>
  >(async () => undefined);
  const pollEnvelopesRef = useRef<() => Promise<void>>(async () => undefined);
  const imageObjectUrlsRef = useRef<Set<string>>(new Set());

  const markRead = useCallback(() => {
    const supabase = createClient();
    void (async () => {
      try {
        await markConversationRead(supabase, conversationId, currentUserId);
        const vault = await openVault(currentUserId);
        await clearVaultConversationUnread(vault, conversationId);
      } catch (error) {
        console.error("[chat] mark read failed", error);
      }
    })();
  }, [conversationId, currentUserId]);

  const reconcileMessage = useCallback(
    (row: MessageRow) => {
      scrollToBottomRef.current = true;
      setMessages((prev) =>
        reconcileIncomingMessage(prev, row, currentUserId),
      );
      if (row.sender_id !== currentUserId) {
        markRead();
      }
    },
    [currentUserId, markRead],
  );

  const isHidden = useCallback((messageId: string) => {
    return hiddenMessageIdsRef.current.has(messageId);
  }, []);

  useEffect(() => {
    markRead();
  }, [markRead]);

  useEffect(() => {
    return () => {
      for (const url of imageObjectUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      imageObjectUrlsRef.current.clear();
    };
  }, [conversationId]);

  useEffect(() => {
    let cancelled = false;

    if (activeConversationRef.current !== conversationId) {
      activeConversationRef.current = conversationId;
      vaultInitializedRef.current = false;
      setVaultReady(false);
      setMessages([]);
      setVaultError(null);
      setRealtimeStatus("connecting");
    }

    async function initVault() {
      setVaultError(null);
      if (!vaultInitializedRef.current) {
        setVaultReady(false);
      }
      try {
        const supabase = createClient();
        const vault = await openVault(currentUserId);
        await ensureDeviceIdentity(supabase, vault, currentUserId);
        await ensurePeerKeyAvailable(supabase, vault, friendId);
        if (cancelled) return;
        try {
          await catchUpEnvelopes(supabase, vault, currentUserId);
        } catch (catchUpErr) {
          console.error("[chat] envelope catch-up failed", catchUpErr);
        }
        const loaded = await loadVaultMessages(conversationId, INITIAL_MESSAGE_LIMIT);
        const hydrated = await hydrateVaultImageMessages(
          supabase,
          vault,
          conversationId,
          loaded,
        );
        if (cancelled) return;
        for (const message of hydrated) {
          if (message.attachment_url?.startsWith("blob:")) {
            imageObjectUrlsRef.current.add(message.attachment_url);
          }
        }
        scrollToBottomRef.current = true;
        setMessages((prev) => mergeLoadedVaultMessages(prev, hydrated));
        setHasMore(loaded.length >= INITIAL_MESSAGE_LIMIT);
        vaultInitializedRef.current = true;
        setVaultReady(true);
      } catch (err) {
        if (!cancelled) {
          console.error("[chat] vault init failed", err);
          setVaultError(formatVaultError(err));
        }
      }
    }

    void initVault();
    return () => {
      cancelled = true;
    };
  }, [conversationId, currentUserId, friendId]);

  useEffect(() => {
    if (pendingScrollRestore.current && scrollContainerRef.current) {
      const { height, top } = pendingScrollRestore.current;
      pendingScrollRestore.current = null;
      const el = scrollContainerRef.current;
      el.scrollTop = top + (el.scrollHeight - height);
      return;
    }

    if (scrollToBottomRef.current) {
      scrollToBottomRef.current = false;
      requestAnimationFrame(() => {
        const el = scrollContainerRef.current;
        if (el) {
          el.scrollTop = el.scrollHeight;
        } else {
          bottomRef.current?.scrollIntoView({ behavior: "instant" });
        }
      });
    }
  }, [messages]);

  const handleEnvelope = useCallback(
    async (row: MessageEnvelopeRow) => {
      if (row.recipient_id !== currentUserId) return;
      const supabase = createClient();
      const vault = await openVault(currentUserId);
      const result = await processEnvelope(supabase, vault, row);
      if (result.skipped) return;

      let attachmentUrl: string | null = null;
      if (row.type === "image") {
        attachmentUrl = await resolveImageDisplayUrl(
          supabase,
          vault,
          result.messageId,
          row.conversation_id,
          result.body,
        );
        imageObjectUrlsRef.current.add(attachmentUrl);
      }

      reconcileMessage({
        id: result.messageId,
        sender_id: row.sender_id,
        body: row.type === "image" ? "" : result.body,
        type: row.type,
        attachment_url: attachmentUrl,
        created_at: result.createdAt,
      });
    },
    [currentUserId, reconcileMessage],
  );

  const pollEnvelopes = useCallback(async () => {
    const supabase = createClient();
    try {
      const rows = await listEnvelopesForRecipient(supabase, currentUserId, {
        conversationId,
      });
      for (const row of rows) {
        await handleEnvelope(row);
      }
    } catch (error) {
      console.error("[chat] envelope poll failed", error);
    }
  }, [conversationId, currentUserId, handleEnvelope]);

  useEffect(() => {
    handleEnvelopeRef.current = handleEnvelope;
  }, [handleEnvelope]);

  useEffect(() => {
    pollEnvelopesRef.current = pollEnvelopes;
  }, [pollEnvelopes]);

  useEffect(() => {
    if (!vaultReady) return;

    const supabase = createClient();
    return subscribeToConversationEnvelopes(supabase, {
      conversationId,
      recipientId: currentUserId,
      onEnvelope: (row) => {
        void handleEnvelopeRef.current(row).catch((err) =>
          console.error("[chat] envelope receive failed", err),
        );
      },
      onStatus: setRealtimeStatus,
      poll: () => pollEnvelopesRef.current(),
    });
  }, [vaultReady, conversationId, currentUserId]);

  async function loadOlderMessages() {
    if (loadingOlder || !hasMore || messages.length === 0) return;

    const oldest = messages[0];
    const scrollEl = scrollContainerRef.current;
    if (scrollEl) {
      pendingScrollRestore.current = {
        height: scrollEl.scrollHeight,
        top: scrollEl.scrollTop,
      };
    }

    setLoadingOlder(true);
    setLoadOlderError(null);

    try {
      const older = await loadOlderVaultMessages(
        conversationId,
        oldest,
        OLDER_MESSAGE_PAGE_SIZE,
      );
      const supabase = createClient();
      const vault = await openVault(currentUserId);
      const hydrated = await hydrateVaultImageMessages(
        supabase,
        vault,
        conversationId,
        older,
      );
      for (const message of hydrated) {
        if (message.attachment_url?.startsWith("blob:")) {
          imageObjectUrlsRef.current.add(message.attachment_url);
        }
      }

      setMessages((prev) => {
        const existing = new Set(prev.map((m) => m.id));
        const unique = hydrated.filter(
          (m) => !existing.has(m.id) && !isHidden(m.id),
        );
        return [...unique, ...prev];
      });
      setHasMore(hydrated.length === OLDER_MESSAGE_PAGE_SIZE);
    } catch (err) {
      pendingScrollRestore.current = null;
      setLoadOlderError(
        err instanceof Error ? err.message : "Could not load older messages.",
      );
    } finally {
      setLoadingOlder(false);
    }
  }

  const MAX_MESSAGE_LENGTH = 4000;

  function formatSendError(message: string) {
    return message.includes("policy")
      ? "Message not sent — friendship may not be accepted or session expired."
      : message;
  }

  async function sendText(text: string, existingClientId?: string) {
    const clientId = existingClientId ?? crypto.randomUUID();

    if (!existingClientId) {
      const pending = createPendingMessage(clientId, currentUserId, text);
      scrollToBottomRef.current = true;
      setMessages((prev) => [...prev, pending]);
    } else {
      setMessages((prev) =>
        prev.map((message) =>
          message.clientId === clientId
            ? { ...message, status: "pending" }
            : message,
        ),
      );
    }

    setSendError(null);

    try {
      const supabase = createClient();
      const vault = await openVault(currentUserId);
      const result = await sendEncryptedText(supabase, vault, {
        conversationId,
        recipientId: friendId,
        senderId: currentUserId,
        messageId: clientId,
        body: text,
      });
      scrollToBottomRef.current = true;
      setMessages((prev) =>
        confirmPendingMessage(prev, clientId, {
          id: clientId,
          sender_id: currentUserId,
          body: text,
          type: "text",
          created_at: result.createdAt,
        }),
      );
      notifyLocalMessage({
        conversationId,
        body: text,
        type: "text",
        createdAt: result.createdAt,
      });
    } catch (error) {
      setMessages((prev) => markMessageFailed(prev, clientId));
      if (!existingClientId) {
        const message = error instanceof Error ? error.message : "Send failed";
        setSendError(formatSendError(message));
      }
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!vaultReady) return;
    const text = body.trim();
    if (!text) return;

    if (text.length > MAX_MESSAGE_LENGTH) {
      setSendError(`Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`);
      return;
    }

    setBody("");
    await sendText(text);
  }

  async function retryMessage(clientId: string, text: string) {
    setSendError(null);
    await sendText(text, clientId);
  }

  async function sendImage(file: File, existingClientId?: string) {
    if (!vaultReady || !friendId) return;

    const clientId = existingClientId ?? crypto.randomUUID();
    let previewUrl: string | null = null;

    if (!existingClientId) {
      previewUrl = URL.createObjectURL(file);
      pendingImageFilesRef.current.set(clientId, file);
      scrollToBottomRef.current = true;
      setMessages((prev) => [
        ...prev,
        createPendingImageMessage(clientId, currentUserId, previewUrl!),
      ]);
    } else {
      const stored = pendingImageFilesRef.current.get(clientId);
      if (!stored) return;
      file = stored;
      setMessages((prev) =>
        prev.map((m) =>
          m.clientId === clientId ? { ...m, status: "pending" } : m,
        ),
      );
    }

    setSendError(null);
    setSendingImage(true);

    try {
      const compressed = await compressImageForChat(file);
      const supabase = createClient();
      const storagePath = await uploadChatImage(
        supabase,
        compressed,
        conversationId,
      );
      const vault = await openVault(currentUserId);
      const result = await sendEncryptedImage(supabase, vault, {
        conversationId,
        recipientId: friendId,
        senderId: currentUserId,
        messageId: clientId,
        imageRef: storagePath,
        localBlob: compressed,
      });
      const displayUrl = await resolveImageDisplayUrl(
        supabase,
        vault,
        clientId,
        conversationId,
        storagePath,
      );
      imageObjectUrlsRef.current.add(displayUrl);

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      pendingImageFilesRef.current.delete(clientId);

      scrollToBottomRef.current = true;
      setMessages((prev) =>
        confirmPendingMessage(prev, clientId, {
          id: clientId,
          sender_id: currentUserId,
          body: "",
          type: "image",
          attachment_url: displayUrl,
          created_at: result.createdAt,
        }),
      );
      notifyLocalMessage({
        conversationId,
        body: "",
        type: "image",
        createdAt: result.createdAt,
      });
    } catch (err) {
      console.error("[chat] image send failed", err);
      setMessages((prev) => markMessageFailed(prev, clientId));
      if (!existingClientId) {
        const raw =
          err instanceof ImageCompressionError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Could not send image.";
        const message = raw.includes("Bucket not found")
          ? "Image storage is not configured on the server."
          : formatSendError(raw);
        setSendError(message);
      }
    } finally {
      setSendingImage(false);
    }
  }

  async function handleDeleteMessage(message: ChatMessage) {
    if (message.status !== "confirmed" || message.id.startsWith("pending-")) {
      return;
    }

    setOpenActionsMessageId(null);
    setDeleteError(null);
    const supabase = createClient();
    const snapshot = messages;

    if (message.sender_id === currentUserId) {
      const removedAt = new Date().toISOString();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id
            ? { ...m, removed_at: removedAt, body: "", status: "confirmed" }
            : m,
        ),
      );

      const { error } = await removeMessage(supabase, message.id);
      if (error) {
        setMessages(snapshot);
        setDeleteError(error.message);
      }
      return;
    }

    hiddenMessageIdsRef.current.add(message.id);
    setMessages((prev) => prev.filter((m) => m.id !== message.id));

    const { error } = await hideMessage(supabase, message.id, currentUserId);
    if (error) {
      hiddenMessageIdsRef.current.delete(message.id);
      setMessages(snapshot);
      setDeleteError(error.message);
    }
  }

  const lastMessageAt = useMemo(() => {
    if (messages.length === 0) return null;
    return messages[messages.length - 1].created_at;
  }, [messages]);

  let lastDay: string | null = null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--chat-bg)]">
      <ChatHeader
        friendId={friendId}
        friendshipId={friendshipId}
        friendName={friendName}
        friendAvatarUrl={friendAvatarUrl}
        lastMessageAt={lastMessageAt}
        variant="classic"
        canCall={isVoiceCallsEnabled() && !!friendId && uiState === "idle"}
        onStartCall={() =>
          void startCall(conversationId, friendId, friendName, friendAvatarUrl)
        }
      />

      {callError && (
        <p className="bg-[#FCEDE8] px-4 py-2 text-center text-sm text-[var(--danger)]" role="alert">
          {callError}
          <button
            type="button"
            className="ml-2 underline"
            onClick={clearCallError}
          >
            Dismiss
          </button>
        </p>
      )}

      {realtimeStatus !== "SUBSCRIBED" && realtimeStatus !== "connecting" && (
        <p className="bg-[#FCEDE8] px-4 py-2 text-center text-xs text-[var(--chat-muted)]">
          Live updates unavailable — refresh if messages seem stale.
        </p>
      )}

      <div
        ref={scrollContainerRef}
        className="flex flex-1 flex-col gap-3.5 overflow-y-auto overflow-x-visible px-7 py-5"
      >
        {hasMore && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => void loadOlderMessages()}
              disabled={loadingOlder}
              className="rounded-full border border-[#EBE3DD] bg-[var(--chat-surface)] px-4 py-2 text-sm font-medium text-[var(--chat-muted)] transition-colors hover:bg-[var(--chat-hover)] disabled:opacity-50"
            >
              {loadingOlder ? "Loading…" : "Load older messages"}
            </button>
          </div>
        )}

        {loadOlderError && (
          <p className="text-center text-sm text-[var(--danger)]" role="alert">
            {loadOlderError}
          </p>
        )}

        {vaultError && (
          <p className="text-center text-sm text-[var(--danger)]" role="alert">
            {vaultError}
          </p>
        )}

        {!vaultReady && !vaultError && messages.length === 0 && (
          <p className="text-center text-sm text-[#A8998F]">
            Loading encrypted messages…
          </p>
        )}

        {vaultReady && messages.length === 0 && (
          <p className="text-center text-sm text-[#A8998F]">
            No messages yet. Say hello!
          </p>
        )}
        {messages.map((message) => {
          const dk = dayKey(message.created_at);
          const showDay = dk !== lastDay;
          lastDay = dk;
          const mine = message.sender_id === currentUserId;

          const isImageMessage =
            message.type === "image" && !message.removed_at;
          const showActionsMenu =
            !message.removed_at && message.status === "confirmed";
          const actionsOpen = openActionsMessageId === message.id;

          return (
            <Fragment key={message.id}>
              {showDay && (
                <div className="flex w-full justify-center">
                  <span className="rounded-full bg-[#F1E9E3] px-3.5 py-1.5 text-xs font-medium text-[#A8998F]">
                    {formatDayLabel(message.created_at)}
                  </span>
                </div>
              )}
              <div
                className={cn(
                  "group flex shrink-0 items-end gap-1",
                  isImageMessage
                    ? "max-w-[min(520px,85%)]"
                    : "max-w-[74%]",
                  mine ? "self-end" : "self-start",
                )}
              >
                {!mine &&
                  (message.removed_at ? (
                    <div className="h-[30px] w-[30px] shrink-0" aria-hidden />
                  ) : (
                    <ChatAvatar name={friendName} size="sm" />
                  ))}
                <div className="relative flex min-w-0 items-end gap-1">
                  <MessageBubble
                    body={message.body}
                    mine={mine}
                    createdAt={message.created_at}
                    status={message.status}
                    variant="classic"
                    removed={!!message.removed_at}
                    actionsOpen={actionsOpen}
                    imageUrl={
                      message.type === "image"
                        ? message.attachment_url
                        : undefined
                    }
                    onLinkOpen={setLinkPreviewUrl}
                    onRetry={
                      message.status === "failed" && message.clientId
                        ? () =>
                            void (message.type === "image"
                              ? sendImage(
                                  pendingImageFilesRef.current.get(
                                    message.clientId!,
                                  )!,
                                  message.clientId,
                                )
                              : retryMessage(message.clientId!, message.body))
                        : undefined
                    }
                  />
                  {showActionsMenu ? (
                    <MessageActionsMenu
                      isOwn={mine}
                      open={actionsOpen}
                      onOpenChange={(open) =>
                        setOpenActionsMessageId(open ? message.id : null)
                      }
                      onDelete={() => void handleDeleteMessage(message)}
                    />
                  ) : message.removed_at ? (
                    <div className="h-8 w-8 shrink-0" aria-hidden />
                  ) : null}
                </div>
              </div>
            </Fragment>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {(sendError || deleteError) && (
        <p className="px-5 pb-1 text-sm text-[var(--danger)]" role="alert">
          {sendError ?? deleteError}
        </p>
      )}

      {!canMessage && (
        <p className="px-5 pb-1 text-center text-sm text-[var(--chat-muted)]">
          Add as friend to send messages
        </p>
      )}

      <ComposeBar
        value={body}
        onChange={setBody}
        onSubmit={sendMessage}
        onSendImage={(file) => void sendImage(file)}
        sending={sendingImage}
        disabled={!canMessage || !vaultReady}
        placeholder={`Message ${friendName.split(" ")[0]}…`}
      />

      <LinkPreviewDialog
        open={!!linkPreviewUrl}
        url={linkPreviewUrl}
        onClose={() => setLinkPreviewUrl(null)}
      />
    </div>
  );
}