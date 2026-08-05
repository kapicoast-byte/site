import { createReadStream, statSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { UPLOAD_DIR, STORAGE_PREFIX } from "@/lib/uploads";
import { firebaseEnabled, bucket } from "@/lib/firebase";

/**
 * Serves a file from the uploads volume.
 *
 * `path.basename` strips any directory component, so "../../etc/passwd" can
 * only ever resolve to "passwd" inside UPLOAD_DIR. The resolved path is then
 * checked against the directory as a second guard.
 */

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  // basename first, always — it is the guard for both backends. A bucket has no
  // directories to escape, but "../" in an object key is still worth refusing.
  const safe = path.basename(name);
  const ext = safe.split(".").pop()?.toLowerCase() ?? "";

  const headers = {
    "Content-Type": TYPES[ext] ?? "application/octet-stream",
    // Filenames are UUIDs, so a given URL's bytes never change.
    "Cache-Control": "public, max-age=31536000, immutable",
    // Never let the browser second-guess the type we declare — that is how an
    // innocuous-looking upload gets executed as something else.
    "X-Content-Type-Options": "nosniff",
    // Belt and braces for anything that slips past the allowlist: served
    // sandboxed, so even an active document cannot touch this origin.
    "Content-Security-Policy": "default-src 'none'; img-src 'self'; media-src 'self'; sandbox",
  } as Record<string, string>;

  /* Firebase Storage. The bucket stays private and the bytes are proxied
     through here, so no Google URL and no signed link ever reaches the page. */
  if (firebaseEnabled) {
    const object = bucket().file(`${STORAGE_PREFIX}/${safe}`);
    const [exists] = await object.exists();
    if (!exists) return new Response("Not found", { status: 404 });

    const [meta] = await object.getMetadata();
    if (meta.size) headers["Content-Length"] = String(meta.size);

    const stream = Readable.toWeb(
      object.createReadStream()
    ) as unknown as ReadableStream;
    return new Response(stream, { headers });
  }

  const full = path.join(UPLOAD_DIR, safe);

  if (!path.resolve(full).startsWith(path.resolve(UPLOAD_DIR))) {
    return new Response("Not found", { status: 404 });
  }

  let size: number;
  try {
    const stat = statSync(full);
    if (!stat.isFile()) return new Response("Not found", { status: 404 });
    size = stat.size;
  } catch {
    return new Response("Not found", { status: 404 });
  }

  headers["Content-Length"] = String(size);
  const stream = Readable.toWeb(
    createReadStream(full)
  ) as unknown as ReadableStream;

  return new Response(stream, { headers });
}
