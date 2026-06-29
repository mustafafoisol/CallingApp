"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { ChatAvatar } from "@/components/chat/avatar";
import { bootstrapAndPrefetchPeer } from "@/lib/e2ee/bootstrap-client";
import { createClient } from "@/lib/supabase/client";
import { PendingRequestsPanel } from "./pending-requests-panel";

interface LookupProfile {
  id: string;
  public_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export function AddFriendDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [publicId, setPublicId] = useState("");
  const [profile, setProfile] = useState<LookupProfile | null>(null);
  const [friendshipStatus, setFriendshipStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!open) return;

    setPublicId("");
    setProfile(null);
    setFriendshipStatus(null);
    setError(null);
    setSuccess(null);
    setLoading(false);

    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

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

  async function lookup() {
    const trimmed = publicId.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    setProfile(null);
    setFriendshipStatus(null);

    const res = await fetch(
      `/api/friends/lookup?publicId=${encodeURIComponent(trimmed)}`,
    );
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Lookup failed");
      return;
    }

    setProfile(data.profile);
    setFriendshipStatus(data.friendship?.status ?? null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      void bootstrapAndPrefetchPeer(user.id, data.profile.id);
    }
  }

  async function sendRequest() {
    if (!profile) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    const res = await fetch("/api/friends/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: profile.id }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Request failed");
      return;
    }

    setSuccess("Friend request sent");
    setFriendshipStatus("pending");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      void bootstrapAndPrefetchPeer(user.id, profile.id);
    }
  }

  function handleBackdropClick(event: React.MouseEvent) {
    if (dialogRef.current?.contains(event.target as Node)) return;
    onClose();
  }

  function handleRefresh() {
    router.refresh();
  }

  if (!open) return null;

  const canAdd = profile && !friendshipStatus && !loading;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onMouseDown={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-friend-title"
        className="w-full max-w-[520px] overflow-hidden rounded-[18px] border border-[#ECE4DE] bg-[var(--chat-surface)] shadow-[0_18px_50px_rgba(60,40,30,0.16)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[#F1E9E3] px-6 pt-5 pb-4">
          <div>
            <h2
              id="add-friend-title"
              className="text-[19px] font-bold tracking-tight text-[var(--chat-text)]"
            >
              Add a friend
            </h2>
            <p className="mt-0.5 text-[13.5px] text-[var(--chat-muted)]">
              Find someone by their exact username
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--chat-hover)] text-[var(--chat-muted)]"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="px-6 pt-4 pb-1.5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void lookup();
            }}
          >
            <div
              className={`flex items-center gap-2.5 rounded-[13px] border bg-white px-4 py-3 transition-shadow ${
                focused
                  ? "border-[var(--chat-coral)] shadow-[0_0_0_3px_rgba(242,107,82,0.12)]"
                  : "border-[#EBE3DD]"
              }`}
            >
              <span className="text-[15px] font-semibold text-[var(--chat-coral)]">
                @
              </span>
              <input
                ref={inputRef}
                value={publicId}
                onChange={(e) =>
                  setPublicId(e.target.value.toUpperCase().replace(/\s/g, ""))
                }
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="CA7K9M2X"
                disabled={loading}
                className="min-w-0 flex-1 bg-transparent text-[14.5px] text-[var(--chat-text)] outline-none placeholder:text-[#C4B7AD]"
                aria-label="Friend username"
              />
              <button
                type="submit"
                disabled={loading || !publicId.trim()}
                className="text-[#C4B7AD] disabled:opacity-50"
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>

        <div className="px-6 pt-3 pb-6">
          {loading && !profile && (
            <p className="text-sm text-[var(--chat-muted)]">Searching…</p>
          )}

          {error && (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm font-medium text-[#34B27B]" role="status">
              {success}
            </p>
          )}

          {profile && (
            <div className="flex items-center gap-3 rounded-[13px] border border-[#F1E9E3] bg-[#FBF6F2] px-3.5 py-3">
              <ChatAvatar
                name={profile.display_name ?? profile.public_id}
                imageUrl={profile.avatar_url}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-[var(--chat-text)]">
                  {profile.display_name ?? "Unnamed user"}
                </p>
                <p className="truncate text-[13px] text-[var(--chat-muted)]">
                  @{profile.public_id}
                </p>
              </div>
              {canAdd && (
                <button
                  type="button"
                  onClick={() => void sendRequest()}
                  className="flex shrink-0 items-center gap-1.5 rounded-[21px] bg-[var(--chat-coral)] px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_2px_8px_rgba(242,107,82,0.3)]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add friend
                </button>
              )}
              {friendshipStatus && (
                <span className="shrink-0 text-[13px] font-medium capitalize text-[var(--chat-muted)]">
                  {friendshipStatus}
                </span>
              )}
            </div>
          )}
        </div>

        <PendingRequestsPanel onResponded={handleRefresh} />
      </div>
    </div>,
    document.body,
  );
}