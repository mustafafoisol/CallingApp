import { NextResponse } from "next/server";
import { GOOGLE_STUN_SERVERS, mergeIceServers } from "@calling-app/core";

export async function GET() {
  const apiKey = process.env.METERED_TURN_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      iceServers: mergeIceServers(GOOGLE_STUN_SERVERS),
    });
  }

  try {
    const response = await fetch(
      `https://callingapp.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`,
      { next: { revalidate: 3600 } },
    );

    if (!response.ok) throw new Error("metered turn failed");

    const turn = (await response.json()) as Array<{
      urls: string | string[];
      username?: string;
      credential?: string;
    }>;

    return NextResponse.json({
      iceServers: mergeIceServers(GOOGLE_STUN_SERVERS, turn),
    });
  } catch {
    return NextResponse.json({
      iceServers: mergeIceServers(GOOGLE_STUN_SERVERS),
    });
  }
}