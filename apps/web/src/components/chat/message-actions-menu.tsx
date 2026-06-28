"use client";

import { useEffect, useId, useRef } from "react";
import { MoreHorizontal } from "lucide-react";
import {
  DeleteIcon,
  EditIcon,
  ForwardIcon,
  ReplyIcon,
} from "@/components/chat/message-action-icons";

function SoonBadge() {
  return (
    <span className="rounded-[6px] bg-[#F1E9E3] px-[7px] py-0.5 text-[10.5px] font-semibold text-[#A8998F]">
      Soon
    </span>
  );
}

function DisabledActionRow({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div
      aria-disabled="true"
      className="flex cursor-not-allowed items-center gap-3 rounded-[9px] px-3 py-2.5 opacity-40"
    >
      {icon}
      <span className="flex-1 text-[14px] font-medium text-[var(--chat-text)]">
        {label}
      </span>
      <SoonBadge />
    </div>
  );
}

export function MessageActionsMenu({
  isOwn,
  open,
  onOpenChange,
  onDelete,
  disabled,
}: {
  isOwn: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      const menu = document.getElementById(menuId);
      if (menu?.contains(target)) return;
      onOpenChange(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange, menuId]);

  function handleDelete() {
    const prompt = isOwn
      ? 'Remove this message for everyone? It will show as "Message removed".'
      : "Hide this message? Only you will stop seeing it.";
    if (!window.confirm(prompt)) return;
    onOpenChange(false);
    onDelete();
  }

  function handleTriggerClick() {
    if (disabled) return;
    onOpenChange(!open);
  }

  const deleteLabel = isOwn ? "Delete" : "Hide";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleTriggerClick}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className="flex h-8 w-8 shrink-0 items-center justify-center self-start rounded-full text-[var(--chat-muted)] opacity-0 transition-opacity hover:bg-[var(--chat-hover)] group-hover:opacity-100 focus:opacity-100 disabled:opacity-30"
        aria-label="Message actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className={`absolute top-[calc(100%+8px)] z-20 w-[208px] overflow-hidden rounded-[14px] border border-[#EDE5DF] bg-white p-1.5 shadow-[0_12px_34px_rgba(60,40,30,0.18)] ${
            isOwn ? "right-8" : "left-0"
          }`}
        >
          <DisabledActionRow icon={<ReplyIcon />} label="Reply" />
          <DisabledActionRow icon={<ForwardIcon />} label="Forward" />
          {isOwn && <DisabledActionRow icon={<EditIcon />} label="Edit" />}
          <div className="mx-2 my-[5px] h-px bg-[#F1E9E3]" />
          <button
            type="button"
            role="menuitem"
            onClick={handleDelete}
            className="flex w-full items-center gap-3 rounded-[9px] bg-[#FCEDE8] px-3 py-2.5 text-left transition-colors hover:bg-[#F9E4DE]"
          >
            <DeleteIcon />
            <span className="flex-1 text-[14px] font-semibold text-[#D4583F]">
              {deleteLabel}
            </span>
          </button>
        </div>
      )}
    </>
  );
}