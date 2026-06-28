"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  ExternalLink,
  Lock,
  RefreshCw,
  X,
} from "lucide-react";
import { getDomain, toEmbedUrl } from "@/lib/chat/link-preview";

export function LinkPreviewDialog({
  open,
  url,
  onClose,
}: {
  open: boolean;
  url: string | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [frameKey, setFrameKey] = useState(0);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFrameKey((key) => key + 1);
    setBlocked(false);
  }, [open, url]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !url) return null;

  const embedUrl = toEmbedUrl(url);
  const displayUrl = url.replace(/^https?:\/\//, "");

  function handleBackdropClick(event: React.MouseEvent) {
    if (dialogRef.current?.contains(event.target as Node)) return;
    onClose();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Link preview"
        className="flex h-[min(660px,90dvh)] w-full max-w-[1000px] flex-col overflow-hidden rounded-[18px] border border-[#ECE4DE] bg-[var(--chat-surface)] shadow-[0_18px_50px_rgba(60,40,30,0.16)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-[var(--chat-border)] bg-[var(--chat-sidebar)] px-4 py-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[var(--chat-hover)] text-[var(--chat-muted)]"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[11px] border border-[#EBE3DD] bg-white px-3.5 py-2">
            <Lock className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
            <span className="min-w-0 truncate font-mono text-[13px] text-[#5C544D]">
              {displayUrl}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setFrameKey((key) => key + 1)}
            className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[var(--chat-hover)] text-[var(--chat-muted)]"
            aria-label="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
            className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[var(--chat-hover)] text-[var(--chat-muted)]"
            aria-label="Open in browser"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[var(--chat-hover)] text-[var(--chat-muted)]"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="relative min-h-0 flex-1 bg-[#1C1814]">
          {blocked ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-sm text-[#E8E0DA]">
                This site cannot be embedded here.
              </p>
              <button
                type="button"
                onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
                className="rounded-[21px] bg-[var(--chat-coral)] px-5 py-2.5 text-sm font-semibold text-white"
              >
                Open {getDomain(url)}
              </button>
            </div>
          ) : (
            <iframe
              key={frameKey}
              src={embedUrl}
              title={getDomain(url)}
              className="h-full w-full border-0 bg-white"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              onError={() => setBlocked(true)}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}