const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;

export function extractUrls(text: string): string[] {
  const matches = text.match(URL_PATTERN);
  if (!matches) return [];

  const seen = new Set<string>();
  const urls: string[] = [];

  for (const match of matches) {
    const trimmed = match.replace(/[),.!?;:]+$/, "");
    if (!seen.has(trimmed)) {
      seen.add(trimmed);
      urls.push(trimmed);
    }
  }

  return urls;
}

export function messageHasLinks(text: string): boolean {
  return extractUrls(text).length > 0;
}