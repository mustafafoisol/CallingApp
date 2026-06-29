import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type IceServer = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

const DEV_STUN_SERVERS: IceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
];

function stunOnlyResponse(warning: string) {
  console.warn(`[api/turn] ${warning}`);
  return NextResponse.json({ iceServers: DEV_STUN_SERVERS, warning });
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.METERED_TURN_API_KEY;
  const appName = process.env.METERED_TURN_APP_NAME;

  if (!apiKey) {
    return stunOnlyResponse(
      "METERED_TURN_API_KEY missing — STUN-only; same-LAN calls only",
    );
  }

  if (!appName) {
    return stunOnlyResponse(
      "METERED_TURN_APP_NAME missing — STUN-only fallback",
    );
  }

  try {
    const url = new URL(
      `https://${appName}.metered.live/api/v1/turn/credentials`,
    );
    url.searchParams.set("apiKey", apiKey);

    const response = await fetch(url.toString(), { next: { revalidate: 3600 } });

    if (!response.ok) {
      throw new Error(`Metered returned ${response.status}`);
    }

    const turn = (await response.json()) as IceServer[];
    return NextResponse.json({
      iceServers: [...DEV_STUN_SERVERS, ...turn],
    });
  } catch (error) {
    console.error("[api/turn] Metered fetch failed:", error);
    return stunOnlyResponse("Metered TURN fetch failed — STUN-only fallback");
  }
}