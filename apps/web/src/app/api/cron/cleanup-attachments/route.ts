import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO(6.7): batch delete expired message_attachments rows and storage objects.
  void request;

  return NextResponse.json({
    ok: true,
    deleted: 0,
    skipped: "cleanup not implemented",
  });
}