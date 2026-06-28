"use client";

import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { getDomain, type LinkPreviewData } from "@/lib/chat/link-preview";

export function LinkPreviewCard({
  url,
  mine,
  onOpen,
}: {
  url: string;
  mine: boolean;
  onOpen: (url: string) => void;
}) {
  const [preview, setPreview] = useState<LinkPreviewData | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!cancelled && !data.error) {
        setPreview(data);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [url]);

  const domain = preview?.siteName ?? getDomain(url);
  const title = preview?.title ?? domain;
  const description = preview?.description;
  const radius = mine
    ? "rounded-[16px_16px_6px_16px]"
    : "rounded-[16px_16px_16px_6px]";

  return (
    <button
      type="button"
      onClick={() => onOpen(url)}
      className={`w-[min(320px,100%)] overflow-hidden border border-[#EDE5DF] bg-[var(--chat-surface)] text-left shadow-[0_2px_10px_rgba(60,40,30,0.06)] transition-shadow hover:shadow-[0_4px_16px_rgba(60,40,30,0.1)] ${radius}`}
    >
      <div className="relative h-[178px] bg-gradient-to-br from-[#2A2420] to-[#4A3F38]">
        {preview?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview.image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.03),rgba(255,255,255,0.03)_12px,transparent_12px,transparent_24px)]" />
        )}
        <div className="absolute left-1/2 top-1/2 flex h-[54px] w-[54px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[rgba(242,107,82,0.95)] shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
          <Play className="h-[22px] w-[22px] fill-white text-white" />
        </div>
      </div>
      <div className="px-3.5 py-3">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--chat-text)]">
          {title}
        </p>
        {description && (
          <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-snug text-[var(--chat-muted)]">
            {description}
          </p>
        )}
        <div className="mt-2 flex items-center gap-1.5">
          <span className="flex h-[13px] w-[13px] items-center justify-center rounded-[3px] bg-[var(--chat-coral)]">
            <Play className="h-2 w-2 fill-white text-white" />
          </span>
          <span className="text-xs text-[#A8998F]">{domain}</span>
        </div>
      </div>
    </button>
  );
}