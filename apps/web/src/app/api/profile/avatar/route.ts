import { NextResponse } from "next/server";
import {
  MAX_AVATAR_BYTES,
  MAX_AVATAR_SIZE_MESSAGE,
} from "@/lib/avatar-upload";
import { createClient } from "@/lib/supabase/server";
import {
  detectImageMime,
  extensionForMime,
  isAllowedImageMime,
  UNSUPPORTED_IMAGE_TYPE_MESSAGE,
} from "@/lib/validate-image";

const BUCKET = "avatars";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function POST(request: Request) {
  const { supabase, user } = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  if (file.size > MAX_AVATAR_BYTES) {
    return NextResponse.json(
      { error: MAX_AVATAR_SIZE_MESSAGE },
      { status: 400 },
    );
  }

  if (!isAllowedImageMime(file.type)) {
    return NextResponse.json(
      { error: UNSUPPORTED_IMAGE_TYPE_MESSAGE },
      { status: 400 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detectedMime = detectImageMime(bytes);

  if (!detectedMime || detectedMime !== file.type) {
    return NextResponse.json(
      { error: UNSUPPORTED_IMAGE_TYPE_MESSAGE },
      { status: 400 },
    );
  }

  const ext = extensionForMime(detectedMime);
  const path = `${user.id}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: detectedMime, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const avatarUrl = urlData.publicUrl;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ avatarUrl });
}

export async function DELETE() {
  const { supabase, user } = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: files } = await supabase.storage.from(BUCKET).list(user.id);

  if (files && files.length > 0) {
    const paths = files.map((f) => `${user.id}/${f.name}`);
    await supabase.storage.from(BUCKET).remove(paths);
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}