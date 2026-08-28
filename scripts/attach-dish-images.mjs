/**
 * Attach the generated dish photos to the live menu.
 *
 *   node scripts/attach-dish-images.mjs              # dry run, changes nothing
 *   node scripts/attach-dish-images.mjs --go
 *   node scripts/attach-dish-images.mjs --rollback   # undo, using the receipt
 *
 * For each PNG in public/dishes/ it re-encodes to WebP exactly the way
 * src/lib/uploads.ts does (1800px longest edge, quality 80), puts it in the
 * Storage bucket under uploads/, writes the matching `media` document, and
 * sets `imageUrl` on the menuItem whose slug matches the filename.
 *
 * The URL is /api/uploads/<name>, same as anything uploaded through the admin
 * panel, so the bucket stays private and nothing about serving changes.
 *
 * Every change is appended to scripts/.attach-receipt.json before the next one
 * starts, so --rollback can put every dish back exactly as it was. Dishes that
 * already have an imageUrl are skipped unless --force: this is a live menu,
 * and a photo someone uploaded by hand outranks a generated one.
 *
 * Plain .mjs and firebase-admin, matching seed/seed.mjs — the runtime image has
 * no compiler.
 */
import { readFileSync, existsSync, writeFileSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import sharp from "sharp";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, "..");
const DISH_DIR = path.join(ROOT, "public", "dishes");
const RECEIPT = path.join(here, ".attach-receipt.json");

const args = process.argv.slice(2);
const GO = args.includes("--go");
const FORCE = args.includes("--force");
const ROLLBACK = args.includes("--rollback");

/* ---- env, exactly as seed.mjs loads it -------------------------------- */
const envFile = path.join(ROOT, ".env");
if (existsSync(envFile)) {
  /* Split on /\r?\n/, not "\n". This .env is CRLF, and a trailing \r defeats
     the regex below — JS `.` does not match \r, so `(.*)$` cannot reach the end
     of the string and every line silently fails to parse. seed/seed-data's
     loader has the same shape and only escapes it because the container
     exports these values instead of reading the file. */
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const b64 = process.env.FIREBASE_SERVICE_ACCOUNT;
const BUCKET = process.env.FIREBASE_STORAGE_BUCKET;
if (!b64) { console.error("FIREBASE_SERVICE_ACCOUNT missing from .env"); process.exit(1); }
if (!BUCKET) { console.error("FIREBASE_STORAGE_BUCKET missing from .env"); process.exit(1); }

const creds = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
if (!getApps().length) {
  initializeApp({ credential: cert(creds), storageBucket: BUCKET, projectId: creds.project_id });
}
const fs_ = getFirestore();
const bucket = getStorage().bucket();

/* ---- rollback ---------------------------------------------------------- */
if (ROLLBACK) {
  if (!existsSync(RECEIPT)) { console.error("No receipt at scripts/.attach-receipt.json — nothing to roll back."); process.exit(1); }
  const receipt = JSON.parse(readFileSync(RECEIPT, "utf8"));
  console.log(`Restoring ${receipt.length} dishes to their previous imageUrl.\n`);
  for (const r of receipt) {
    await fs_.collection("menuItems").doc(r.docId).update({ imageUrl: r.previousImageUrl ?? null });
    console.log(`  ${r.name} -> ${r.previousImageUrl ?? "(no image)"}`);
  }
  console.log("\nDone. Storage objects and media documents were left in place; they are unreferenced, not harmful.");
  process.exit(0);
}

/* ---- match files to dishes --------------------------------------------- */
const files = readdirSync(DISH_DIR).filter((f) => f.endsWith(".png"));
const snap = await fs_.collection("menuItems").get();
const bySlug = new Map();
snap.forEach((d) => bySlug.set(d.data().slug, { id: d.id, ...d.data() }));

const plan = [];
const orphans = [];
for (const f of files) {
  const slug = f.replace(/\.png$/, "");
  const dish = bySlug.get(slug);
  if (!dish) { orphans.push(slug); continue; }
  if (dish.imageUrl && !FORCE) continue;
  plan.push({ file: f, slug, docId: dish.id, name: dish.name, previousImageUrl: dish.imageUrl ?? null });
}

console.log(`menu in Firestore   ${snap.size} dishes`);
console.log(`images on disk      ${files.length}`);
console.log(`already have a photo ${files.length - plan.length - orphans.length}${FORCE ? " (overwriting: --force)" : " (skipped)"}`);
if (orphans.length) console.log(`no matching dish    ${orphans.length}: ${orphans.slice(0, 5).join(", ")}`);
console.log(`to attach           ${plan.length}\n`);

if (!GO) {
  console.log("DRY RUN — Firestore and Storage untouched. Add --go to apply.\n");
  plan.slice(0, 5).forEach((p) => console.log(`  ${p.name.padEnd(24)} ${p.file} -> imageUrl`));
  if (plan.length > 5) console.log(`  … and ${plan.length - 5} more`);
  process.exit(0);
}

/* ---- apply ------------------------------------------------------------- */
const receipt = existsSync(RECEIPT) ? JSON.parse(readFileSync(RECEIPT, "utf8")) : [];
let done = 0, failed = 0, bytesIn = 0, bytesOut = 0;

for (const p of plan) {
  try {
    const input = await readFile(path.join(DISH_DIR, p.file));
    const { data, info } = await sharp(input, { failOn: "none" })
      .rotate()
      .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });

    const stored = `${randomUUID()}.webp`;
    await bucket.file(`uploads/${stored}`).save(Buffer.from(data), {
      contentType: "image/webp",
      metadata: { cacheControl: "public, max-age=31536000, immutable" },
    });

    const url = `/api/uploads/${stored}`;
    const media = fs_.collection("media").doc();
    await media.set({
      filename: p.file,
      url,
      mimeType: "image/webp",
      size: data.byteLength,
      width: info.width,
      height: info.height,
      alt: `${p.name} at Kapi Coast`,
      createdAt: new Date(),
    });

    receipt.push({ ...p, newImageUrl: url, mediaId: media.id, stored, at: new Date().toISOString() });
    writeFileSync(RECEIPT, JSON.stringify(receipt, null, 2));   // receipt first, then the live change

    await fs_.collection("menuItems").doc(p.docId).update({ imageUrl: url });

    bytesIn += input.byteLength; bytesOut += data.byteLength;
    console.log(`  ok  ${String(++done).padStart(3)}/${plan.length}  ${p.name.padEnd(24)} ${Math.round(input.byteLength / 1024)}KB -> ${Math.round(data.byteLength / 1024)}KB`);
  } catch (e) {
    failed++;
    console.log(`  FAIL     ${p.name}: ${e.message.slice(0, 110)}`);
  }
}

console.log(`\n${done} attached, ${failed} failed.`);
if (done) {
  console.log(`${(bytesIn / 1048576).toFixed(1)} MB of PNG became ${(bytesOut / 1048576).toFixed(1)} MB of WebP.`);
  console.log("Receipt: scripts/.attach-receipt.json — `--rollback` restores every previous imageUrl.");
}
