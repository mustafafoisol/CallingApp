import type { LinkPreviewData } from "@/lib/chat/link-preview";

const STORAGE_KEY = "calling-app:link-previews";
const MAX_ENTRIES = 100;
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface CacheEntry {
  data: LinkPreviewData;
  cachedAt: number;
}

type CacheStore = Record<string, CacheEntry>;

function readStore(): CacheStore {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as CacheStore;
  } catch {
    return {};
  }
}

function writeStore(store: CacheStore) {
  if (typeof window === "undefined") return;

  const entries = Object.entries(store).sort(
    (a, b) => b[1].cachedAt - a[1].cachedAt,
  );
  const trimmed = Object.fromEntries(entries.slice(0, MAX_ENTRIES));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function readLinkPreviewCache(url: string): LinkPreviewData | null {
  const entry = readStore()[url];
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > TTL_MS) return null;
  return entry.data;
}

export function writeLinkPreviewCache(url: string, data: LinkPreviewData) {
  const store = readStore();
  store[url] = { data, cachedAt: Date.now() };
  writeStore(store);
}