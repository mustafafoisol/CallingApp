import { NextResponse } from "next/server";
import {
  getDomain,
  isPublicHttpUrl,
  parseOpenGraph,
  type LinkPreviewData,
} from "@/lib/chat/link-preview";

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url")?.trim();

  if (!url || !isPublicHttpUrl(url)) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const fallback: LinkPreviewData = {
    url,
    title: getDomain(url),
    description: null,
    image: null,
    siteName: getDomain(url),
  };

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "CallingAppLinkPreview/1.0",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });

    if (!response.ok) {
      return NextResponse.json(fallback);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return NextResponse.json(fallback);
    }

    const html = await response.text();
    return NextResponse.json(parseOpenGraph(html.slice(0, 200_000), url));
  } catch {
    return NextResponse.json(fallback);
  }
}