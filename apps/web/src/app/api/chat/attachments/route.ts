import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO(6.2): verify conversation participant, store ciphertext in
  // chat-media-private, insert message_attachments with 24h expires_at.
  void request;

  return NextResponse.json(
    { error: "Attachment upload not implemented" },
    { status: 501 },
  );
}