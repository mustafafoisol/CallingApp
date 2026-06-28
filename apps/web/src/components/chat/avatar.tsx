"use client";

import { useState } from "react";
import {
  avatarColorFromName,
  initialsFromName,
} from "@/lib/chat/avatar";

export function ChatAvatar({
  name,
  imageUrl,
  size = "md",
}: {
  name: string;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const [imgError, setImgError] = useState(false);
  const sizeClass =
    size === "sm"
      ? "h-[30px] w-[30px] text-xs"
      : size === "lg"
        ? "h-12 w-12 text-lg"
        : size === "xl"
          ? "h-[76px] w-[76px] text-[26px]"
          : "h-11 w-11 text-base";

  if (imageUrl && !imgError) {
    return (
      <img
        src={imageUrl}
        alt=""
        className={`shrink-0 rounded-full object-cover ${sizeClass}`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${sizeClass}`}
      style={{ backgroundColor: avatarColorFromName(name) }}
    >
      {initialsFromName(name)}
    </div>
  );
}