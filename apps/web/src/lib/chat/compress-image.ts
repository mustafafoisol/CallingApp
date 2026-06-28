import imageCompression from "browser-image-compression";

const MAX_OUTPUT_BYTES = 1_048_576;
const MAX_DIMENSION = 1920;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export class ImageCompressionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageCompressionError";
  }
}

function outputType(mime: string): "image/webp" | "image/jpeg" {
  return mime === "image/png" ? "image/webp" : mime as "image/webp" | "image/jpeg";
}

function extensionForType(type: string): string {
  if (type === "image/webp") return "webp";
  if (type === "image/jpeg") return "jpg";
  return "png";
}

export async function compressImageForChat(file: File): Promise<File> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new ImageCompressionError("Only JPEG, PNG, and WebP images are supported.");
  }

  const targetType = outputType(file.type);
  let quality = 0.85;

  for (let attempt = 0; attempt < 6; attempt++) {
    const compressed = await imageCompression(file, {
      maxSizeMB: MAX_OUTPUT_BYTES / 1_048_576,
      maxWidthOrHeight: MAX_DIMENSION,
      useWebWorker: true,
      initialQuality: quality,
      fileType: targetType,
    });

    if (compressed.size <= MAX_OUTPUT_BYTES) {
      const ext = extensionForType(targetType);
      return new File([compressed], `image.${ext}`, { type: targetType });
    }

    quality -= 0.12;
    if (quality < 0.35) break;
    file = compressed;
  }

  throw new ImageCompressionError("Could not compress image under 1 MB.");
}