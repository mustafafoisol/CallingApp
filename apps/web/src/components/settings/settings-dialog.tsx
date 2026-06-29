"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { ChatAvatar } from "@/components/chat/avatar";
import { BlockedUsersPanel } from "@/components/friends/blocked-users-panel";
import { NotificationSettingsSection } from "@/components/settings/notification-settings-section";
import { AVATAR_ACCEPT } from "@/lib/avatar-upload";
import {
  compressImageForAvatar,
  ImageCompressionError,
} from "@/lib/chat/compress-image";
import { purgeLocalData } from "@/lib/session/purge";
import { createClient } from "@/lib/supabase/client";

export function SettingsDialog({
  open,
  onClose,
  displayName: initialName,
  publicId,
  avatarUrl: initialAvatarUrl,
}: {
  open: boolean;
  onClose: () => void;
  displayName: string;
  publicId: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDisplayName(initialName);
    setAvatarUrl(initialAvatarUrl);
    setMessage(null);
    setLoading(false);
    setAvatarLoading(false);
  }, [open, initialName, initialAvatarUrl]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDisplayName(initialName);
        setMessage(null);
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, initialName, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  async function saveProfile() {
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName }),
    });
    setLoading(false);

    if (!res.ok) {
      setMessage("Failed to save");
      return;
    }

    setMessage("Saved");
    router.refresh();
    onClose();
  }

  async function uploadAvatar(file: File) {
    setAvatarLoading(true);
    setMessage(null);

    let compressed: File;
    try {
      compressed = await compressImageForAvatar(file);
    } catch (error) {
      setAvatarLoading(false);
      setMessage(
        error instanceof ImageCompressionError
          ? error.message
          : "Failed to prepare photo",
      );
      return;
    }

    const formData = new FormData();
    formData.append("file", compressed);

    const res = await fetch("/api/profile/avatar", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setAvatarLoading(false);

    if (!res.ok) {
      setMessage(data.error ?? "Failed to upload photo");
      return;
    }

    setAvatarUrl(data.avatarUrl);
    setMessage("Photo updated");
    router.refresh();
  }

  async function removeAvatar() {
    setAvatarLoading(true);
    setMessage(null);

    const res = await fetch("/api/profile/avatar", { method: "DELETE" });
    setAvatarLoading(false);

    if (!res.ok) {
      setMessage("Failed to remove photo");
      return;
    }

    setAvatarUrl(null);
    setMessage("Photo removed");
    router.refresh();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void uploadAvatar(file);
  }

  async function logout() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await purgeLocalData(user.id);
    }

    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function handleCancel() {
    setDisplayName(initialName);
    setMessage(null);
    onClose();
  }

  function handleBackdropClick(event: React.MouseEvent) {
    if (dialogRef.current?.contains(event.target as Node)) return;
    handleCancel();
  }

  if (!open) return null;

  const dirty = displayName !== initialName;

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
        aria-labelledby="settings-title"
        className="flex max-h-[min(90dvh,820px)] w-full max-w-[520px] flex-col overflow-hidden rounded-[18px] border border-[#ECE4DE] bg-[var(--chat-surface)] shadow-[0_18px_50px_rgba(60,40,30,0.16)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between border-b border-[#F1E9E3] px-6 pt-5 pb-4">
          <div>
            <h2
              id="settings-title"
              className="text-[19px] font-bold tracking-tight text-[var(--chat-text)]"
            >
              Settings
            </h2>
            <p className="mt-0.5 text-[13.5px] text-[var(--chat-muted)]">
              Manage your profile
            </p>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--chat-hover)] text-[var(--chat-muted)]"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex items-center gap-[18px] px-6 pt-6 pb-4">
            <div className="relative shrink-0">
              <ChatAvatar
                name={displayName || publicId}
                imageUrl={avatarUrl}
                size="xl"
              />
              <button
                type="button"
                disabled={avatarLoading}
                onClick={() => fileInputRef.current?.click()}
                className="absolute -right-0.5 -bottom-0.5 flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-white bg-[var(--chat-coral)] text-white shadow-[0_2px_6px_rgba(242,107,82,0.4)] disabled:opacity-50"
                aria-label="Upload photo"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept={AVATAR_ACCEPT}
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={avatarLoading}
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-[21px] bg-[var(--chat-coral)] px-[18px] py-2.5 text-[13.5px] font-semibold text-white shadow-[0_2px_8px_rgba(242,107,82,0.3)] disabled:opacity-50"
                >
                  Upload photo
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    disabled={avatarLoading}
                    onClick={() => void removeAvatar()}
                    className="rounded-[21px] border border-[#EBE3DD] bg-white px-4 py-2.5 text-[13.5px] font-semibold text-[var(--chat-muted)] disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="mt-2 text-[12.5px] text-[#A8998F]">
                JPEG, PNG, or WebP. Any size — compressed to 100 KB.
              </p>
            </div>
          </div>

          <div className="px-6 pt-1.5 pb-3.5">
            <label
              htmlFor="settings-display-name"
              className="mb-1.5 block text-[12.5px] font-semibold text-[var(--chat-muted)]"
            >
              Name
            </label>
            <div className="rounded-[13px] border border-[#EBE3DD] bg-[#F8F2ED] px-4 py-3">
              <input
                id="settings-display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-transparent text-[14.5px] text-[var(--chat-text)] outline-none"
              />
            </div>
          </div>

          <div className="px-6 pb-2">
            <p className="mb-1.5 text-[12.5px] font-semibold text-[var(--chat-muted)]">
              Username
            </p>
            <div className="flex items-center gap-2 rounded-[13px] border border-[#EBE3DD] bg-[#F8F2ED] px-4 py-3">
              <span className="text-[14.5px] font-semibold text-[#C4B7AD]">@</span>
              <p className="min-w-0 flex-1 truncate text-[14.5px] text-[var(--chat-text)]">
                {publicId}
              </p>
            </div>
            <p className="mt-1.5 text-xs text-[#A8998F]">
              This is how people find and mention you.
            </p>
          </div>

          <NotificationSettingsSection />

          <div className="px-6 py-4">
            <BlockedUsersPanel embedded />
          </div>

          <div className="px-6 pb-4">
            <button
              type="button"
              onClick={() => void logout()}
              className="w-full rounded-[13px] border border-[#EBE3DD] px-4 py-3 text-sm font-semibold text-[var(--danger)] transition-colors hover:bg-[#FDF5F4]"
            >
              Log out
            </button>
          </div>
        </div>

        <div className="shrink-0 border-t border-[#F1E9E3] px-6 py-4">
          {message && (
            <p className="mb-3 text-center text-sm text-[var(--chat-muted)]">
              {message}
            </p>
          )}
          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-[23px] border border-[#EBE3DD] bg-white px-[22px] py-2.5 text-sm font-semibold text-[var(--chat-muted)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void saveProfile()}
              disabled={loading || !dirty}
              className="rounded-[23px] bg-[var(--chat-coral)] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_2px_10px_rgba(242,107,82,0.35)] disabled:opacity-50"
            >
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}