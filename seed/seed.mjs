/**
 * Seeds Firestore from seed/seed-data.json.
 *
 * Idempotent: every write is keyed on a natural unique field and skips
 * documents that already exist, so the container entrypoint can run this on
 * every boot without duplicating anything or overwriting edits made in the
 * admin panel.
 *
 * Two things differ from the Postgres version this replaces:
 *
 *   - Every document is written complete. Prisma applied column defaults for
 *     anything the seed omitted; Firestore has no schema and no defaults, so a
 *     field left out here is simply absent at runtime and reads as undefined.
 *     The `withDefaults` helpers below exist for exactly that reason.
 *
 *   - Each dish carries its category's slug and label alongside categoryId.
 *     Firestore cannot join, and the menu pages need the category name, so it
 *     is denormalised at write time.
 *
 * Plain .mjs rather than TypeScript so the runtime image needs no compiler.
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { LEGAL_PAGES } from "./legal-pages.mjs";
import { RECIPES } from "./recipes.mjs";
import { POSTS } from "./journal.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

// Load .env when run by hand; in the container the values are already exported.
const envFile = path.join(here, "..", ".env");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

const b64 = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!b64) {
  console.error("FIREBASE_SERVICE_ACCOUNT is not set — cannot seed.");
  process.exit(1);
}

const account = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: account.project_id,
      clientEmail: account.client_email,
      privateKey: account.private_key,
    }),
  });
}
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

const data = JSON.parse(readFileSync(path.join(here, "seed-data.json"), "utf8"));
const frame = (n) => `/frames/ezgif-frame-${String(n).padStart(3, "0")}.jpg`;
const now = () => new Date();

/** Creates a document only if nothing matches `field == value`. */
async function createIfAbsent(collection, field, value, doc) {
  const found = await db.collection(collection).where(field, "==", value).limit(1).get();
  if (!found.empty) return { id: found.docs[0].id, created: false };
  const ref = db.collection(collection).doc();
  await ref.set({ createdAt: now(), updatedAt: now(), ...doc });
  return { id: ref.id, created: true };
}

/** Like the above but for the two-field key cake options use. */
async function createIfAbsentPair(collection, a, av, b, bv, doc) {
  const found = await db
    .collection(collection)
    .where(a, "==", av)
    .where(b, "==", bv)
    .limit(1)
    .get();
  if (!found.empty) return { id: found.docs[0].id, created: false };
  const ref = db.collection(collection).doc();
  await ref.set({ createdAt: now(), updatedAt: now(), ...doc });
  return { id: ref.id, created: true };
}

const menuDefaults = {
  tamil: "",
  blurb: "",
  accent: "#6B4226",
  imageUrl: null,
  tags: [],
  published: true,
  order: 0,
  time: "",
  serves: "",
  level: "",
  ingredients: [],
  steps: [],
  note: "",
};

const postDefaults = {
  category: "Notes",
  excerpt: "",
  imageUrl: null,
  readMins: 4,
  body: [],
  published: true,
};

const cakeOptionDefaults = {
  note: "",
  price: 0,
  multiplier: 100,
  tierColor: "#6B4226",
  frostColor: "#E8D4B8",
  heightPx: 62,
  order: 0,
  active: true,
};

async function main() {
  const counts = { categories: 0, menu: 0, posts: 0, pages: 0, cakeOptions: 0, packages: 0 };

  /* ---- Settings (a single document at settings/main) --------------------- */
  const cafe = data.cafe;
  const settingsRef = db.collection("settings").doc("main");
  if (!(await settingsRef.get()).exists) {
    await settingsRef.set({
      cafeName: cafe.name,
      tamilName: cafe.tamil,
      tagline: cafe.tagline,
      phone: cafe.phone,
      whatsapp: cafe.whatsapp,
      email: cafe.email,
      addressL1: cafe.addressLines[0],
      addressL2: cafe.addressLines[1],
      addressL3: cafe.addressLines[2],
      mapsQuery: cafe.mapsQuery,
      hours: cafe.hours,
      heroEyebrow: "OMR · Kazhipattur",
      heroBadge: "Open daily 6 am – 10 pm",
      heroTrust: "Freshly brewed daily · Custom cakes to order",
      heroSide: "Café · snacks · coastal flavours",
      heroLine1: "Filter coffee, hot chai and fresh snacks made through the day.",
      heroLine2:
        "An easy place to sit — from the first cup of the morning to the last of the night.",
      logoUrl: "/img/logo.png",
      logoDarkUrl: "/img/logo-nav.png",
      heroVideoUrl: "/video/kapi-hills.mp4",
      heroPosterUrl: "/img/hero-poster.jpg",
      storyImage1Url: frame(25),
      storyImage2Url: frame(16),
      ownerName: "",
      ownerRole: "Owner",
      ownerPhotoUrl: "/img/owner-placeholder.webp",
      ownerNote: "",
      marquee: [
        "Filter Coffee",
        "Mirchi Bajji",
        "Pani Puri",
        "Maska Bun",
        "Fresh Juice",
        "Milkshakes",
        "Custom Cakes",
      ],
      updatedAt: now(),
    });
    console.log("  settings created");
  }

  /* ---- Categories -------------------------------------------------------- */
  const cats = {};
  for (const [i, c] of data.categories.entries()) {
    const res = await createIfAbsent("categories", "slug", c.id, {
      slug: c.id,
      label: c.label,
      order: i,
    });
    cats[c.id] = { id: res.id, slug: c.id, label: c.label };
    if (res.created) counts.categories++;
  }

  /* ---- Menu -------------------------------------------------------------- */
  for (const [i, m] of data.menu.entries()) {
    const cat = cats[m.cat];
    const res = await createIfAbsent("menuItems", "slug", m.id, {
      ...menuDefaults,
      slug: m.id,
      name: m.name,
      tamil: m.tamil ?? "",
      price: m.price,
      blurb: m.blurb ?? "",
      accent: m.accent ?? menuDefaults.accent,
      tags: m.tags ?? [],
      order: i,
      time: m.time ?? "",
      serves: m.serves ?? "",
      level: m.level ?? "",
      ingredients: m.ingredients ?? [],
      steps: m.steps ?? [],
      note: m.note ?? "",
      categoryId: cat.id,
      // Denormalised so the menu pages need no join.
      categorySlug: cat.slug,
      categoryLabel: cat.label,
    });
    if (res.created) counts.menu++;
  }

  /* ---- Recipes ----------------------------------------------------------- */
  // Only where the dish has no method yet, so anything edited in the admin
  // panel survives a redeploy. Steps alone is not a sufficient test: the
  // bottled drinks legitimately have none, and checking only that would
  // rewrite those five on every single run.
  let filled = 0;
  for (const [slug, rec] of Object.entries(RECIPES)) {
    const found = await db.collection("menuItems").where("slug", "==", slug).limit(1).get();
    if (found.empty) continue;
    const doc = found.docs[0];
    const cur = doc.data();
    if ((cur.steps?.length ?? 0) > 0 || cur.note) continue;
    await doc.ref.set({ ...rec, updatedAt: now() }, { merge: true });
    filled++;
  }
  if (filled) console.log(`  recipes filled in: ${filled}`);

  /* ---- Journal ----------------------------------------------------------- */
  for (const p of data.posts) {
    const res = await createIfAbsent("posts", "slug", p.slug, {
      ...postDefaults,
      slug: p.slug,
      title: p.title,
      category: p.cat,
      excerpt: p.excerpt,
      readMins: p.read,
      imageUrl: "/" + p.img,
      body: p.body,
      publishedAt: new Date(p.date),
    });
    if (res.created) counts.posts++;
  }

  for (const post of POSTS) {
    const res = await createIfAbsent("posts", "slug", post.slug, {
      ...postDefaults,
      ...post,
      publishedAt: now(),
    });
    if (res.created) counts.posts++;
  }

  /* ---- Cake options ------------------------------------------------------ */
  const cake = data.cake;
  const put = async (kind, key, fields) => {
    const res = await createIfAbsentPair("cakeOptions", "kind", kind, "key", key, {
      ...cakeOptionDefaults,
      kind,
      key,
      ...fields,
    });
    if (res.created) counts.cakeOptions++;
  };

  for (const [i, f] of cake.flavours.entries())
    await put("flavour", f.id, {
      label: f.label,
      note: f.note,
      price: f.rate,
      tierColor: f.tier,
      frostColor: f.frost,
      order: i,
    });

  for (const [i, s] of cake.sizes.entries())
    await put("size", s.id, {
      label: s.label,
      note: s.note,
      multiplier: Math.round(s.mult * 100),
      heightPx: s.h,
      order: i,
    });

  for (const [i, f] of cake.finishes.entries())
    await put("finish", f.id, { label: f.label, note: f.note, price: f.add, order: i });

  for (const [i, o] of cake.occasions.entries())
    await put("occasion", o.id, { label: o.label, order: i });

  for (const [i, a] of cake.addons.entries())
    await put("addon", a.id, { label: a.label, note: a.note, price: a.add, order: i });

  /* ---- Packages ---------------------------------------------------------- */
  for (const [i, p] of cake.packages.entries()) {
    const res = await createIfAbsent("packages", "name", p.name, {
      name: p.name,
      price: p.price,
      unit: p.unit ?? "",
      items: p.items ?? [],
      hero: !!p.hero,
      order: i,
      active: true,
    });
    if (res.created) counts.packages++;
  }

  /* ---- Terms & Privacy --------------------------------------------------- */
  const settingsDoc = (await settingsRef.get()).data();
  for (const page of LEGAL_PAGES(settingsDoc)) {
    const res = await createIfAbsent("pages", "slug", page.slug, {
      ...page,
      intro: page.intro ?? "",
      published: true,
    });
    if (res.created) counts.pages++;
  }

  console.log("    seeded:", JSON.stringify(counts));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  });
