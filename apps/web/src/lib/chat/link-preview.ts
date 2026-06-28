export interface LinkPreviewData {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
]);

export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function extractYoutubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtube.com" || host === "m.youtube.com") {
      return parsed.searchParams.get("v");
    }

    if (host === "youtu.be") {
      const id = parsed.pathname.slice(1).split("/")[0];
      return id || null;
    }
  } catch {
    return null;
  }

  return null;
}

export function youtubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function buildYoutubePreview(url: string): LinkPreviewData | null {
  const videoId = extractYoutubeVideoId(url);
  if (!videoId) return null;

  return {
    url,
    title: "YouTube video",
    description: null,
    image: youtubeThumbnailUrl(videoId),
    siteName: "YouTube",
  };
}

export function toEmbedUrl(url: string): string {
  const videoId = extractYoutubeVideoId(url);
  if (videoId) return `https://www.youtube.com/embed/${videoId}`;
  return url;
}

export function withYoutubeThumbnail(
  data: LinkPreviewData,
  url: string,
): LinkPreviewData {
  const videoId = extractYoutubeVideoId(url);
  if (!videoId) return data;

  return {
    ...data,
    image: data.image ?? youtubeThumbnailUrl(videoId),
    siteName: data.siteName ?? "YouTube",
  };
}

export function isPublicHttpUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    const host = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTS.has(host)) return false;
    if (host.endsWith(".local")) return false;

    if (/^10\./.test(parsed.hostname)) return false;
    if (/^192\.168\./.test(parsed.hostname)) return false;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(parsed.hostname)) return false;

    return true;
  } catch {
    return false;
  }
}

export function parseOpenGraph(html: string, url: string): LinkPreviewData {
  const readMeta = (property: string) => {
    const match = html.match(
      new RegExp(
        `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
        "i",
      ),
    );
    return match?.[1]?.trim() ?? null;
  };

  const title =
    readMeta("og:title") ??
    html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ??
    null;

  return {
    url,
    title,
    description: readMeta("og:description") ?? readMeta("description"),
    image: readMeta("og:image"),
    siteName: readMeta("og:site_name") ?? getDomain(url),
  };
}