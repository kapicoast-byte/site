import "server-only";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { db } from "./db";
import { firebaseEnabled, bucket } from "./firebase";

/**
 * Where uploaded files live.
 *
 * With Firebase configured they go to a private Storage bucket; without it they
 * go to a directory on disk. The stored filename is identical either way, and
 * the public URL stays /api/uploads/<name> in both cases, so switching backends
 * does not invalidate anything already in the database.
 *
 * Files are always served through our own route rather than a Google URL. That
 * keeps the bucket completely private, keeps Firebase out of the HTML, and
 * means no signed URLs to expire.
 */

export const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

/** Folder inside the bucket, so the bucket can hold other things later. */
export const STORAGE_PREFIX = "uploads";

const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  // SVG is deliberately NOT allowed. It is an XML document that can carry
  // <script>, and these files are served back from our own origin, so a single
  // crafted upload would run with full access to the admin session. Nothing on
  // the site needs uploaded SVG — the logo and icons are static assets.
  "video/mp4": "mp4",
  "video/webm": "webm",
};

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

/** Still photos we re-encode. GIF is left alone so animation survives; SVG is
 *  already small and vector; video is not our business here. */
const RECOMPRESS = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

/** A phone camera shoots 4000px+. Nothing on the site displays a dish wider
 *  than about 900 CSS px, so 1800 covers a 2x screen with room to spare. */
const MAX_EDGE = 1800;

export class UploadError extends Error {}

type Encoded = {
  buffer: Buffer;
  ext: string;
  mime: string;
  width?: number;
  height?: number;
};

/**
 * Re-encode a photo to WebP, downscaled and auto-rotated.
 *
 * WebP is typically 25–35% smaller than equivalent-quality JPEG and is
 * supported by every browser in current use, so the page paints sooner on a
 * phone connection.
 *
 * Two details that matter more than the format:
 *   - `.rotate()` bakes in EXIF orientation before the metadata is dropped.
 *     Without it, photos taken sideways on a phone save sideways.
 *   - We keep the original if WebP somehow comes out larger, which happens with
 *     small images and with files that were already well compressed.
 */
async function encodeImage(input: Buffer, mime: string): Promise<Encoded> {
  const original = { buffer: input, ext: ALLOWED[mime], mime };

  if (!RECOMPRESS.has(mime)) return original;

  try {
    const pipeline = sharp(input, { failOn: "none" })
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 });

    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

    if (data.byteLength >= input.byteLength && mime !== "image/png") {
      // Already smaller as-is. PNG is the exception: a photo saved as PNG can
      // beat WebP on bytes yet still be the wrong format to serve, and a
      // screenshot-sized PNG is worth converting regardless.
      return { ...original, width: info.width, height: info.height };
    }

    return {
      buffer: Buffer.from(data),
      ext: "webp",
      mime: "image/webp",
      width: info.width,
      height: info.height,
    };
  } catch {
    // A corrupt or unusual file should not block the upload — store what we
    // were given rather than failing the save.
    return original;
  }
}

export async function saveUpload(file: File, alt = "") {
  if (!file || file.size === 0) throw new UploadError("No file received.");
  if (file.size > MAX_BYTES) {
    throw new UploadError(
      `That file is ${(file.size / 1048576).toFixed(1)} MB. The limit is 25 MB.`
    );
  }

  const ext = ALLOWED[file.type];
  if (!ext) {
    throw new UploadError(
      `${file.type || "That file type"} isn't allowed. Use JPG, PNG, WebP, AVIF, GIF, MP4 or WebM.`
    );
  }

  const encoded = await encodeImage(
    Buffer.from(await file.arrayBuffer()),
    file.type
  );

  // Generated name — never trust the client's filename for the path on disk.
  // Extension comes from what we actually encoded, not from what was sent.
  const stored = `${randomUUID()}.${encoded.ext}`;

  if (firebaseEnabled) {
    await bucket()
      .file(`${STORAGE_PREFIX}/${stored}`)
      .save(encoded.buffer, {
        contentType: encoded.mime,
        // The object is never made public: it is read back through our own
        // route, so there is no URL to guess and nothing to expire.
        metadata: { cacheControl: "public, max-age=31536000, immutable" },
      });
  } else {
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, stored), encoded.buffer);
  }

  return db.media.create({
    data: {
      filename: file.name.slice(0, 200),
      url: `/api/uploads/${stored}`,
      mimeType: encoded.mime,
      size: encoded.buffer.byteLength,
      width: encoded.width ?? null,
      height: encoded.height ?? null,
      alt,
    },
  });
}

export async function deleteUpload(id: string) {
  const media = await db.media.findUnique({ where: { id } });
  if (!media) return;

  const stored = media.url.split("/").pop();
  if (stored) {
    // basename only — refuse anything that could escape the directory
    const safe = path.basename(stored);
    if (firebaseEnabled) {
      await bucket().file(`${STORAGE_PREFIX}/${safe}`).delete().catch(() => {});
    } else {
      await unlink(path.join(UPLOAD_DIR, safe)).catch(() => {});
    }
  }
  await db.media.delete({ where: { id } });
}
