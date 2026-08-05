/**
 * Seeds the database from prisma/seed-data.json.
 *
 * Idempotent: every write is an upsert keyed on a natural unique field, so the
 * container entrypoint can run this on every boot without duplicating rows or
 * overwriting edits made in the admin panel.
 *
 * Plain .mjs rather than TypeScript so the runtime image doesn't need tsx.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { LEGAL_PAGES } from "./legal-pages.mjs";
import { RECIPES } from "./recipes.mjs";
import { POSTS } from "./journal.mjs";

const db = new PrismaClient();
const here = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(path.join(here, "seed-data.json"), "utf8"));

const frame = (n) => `/frames/ezgif-frame-${String(n).padStart(3, "0")}.jpg`;

async function main() {
  // ---- Settings (single row) ---------------------------------------------
  const cafe = data.cafe;
  await db.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
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
      heroBadge: "Open daily 6 am – 10 pm",
      heroTrust: "Freshly brewed daily · Custom cakes to order",
      heroSide: "Café · snacks · coastal flavours",
      heroLine1: "Filter coffee, hot chai and fresh snacks made through the day.",
      heroLine2: "An easy place to sit — from the first cup of the morning to the last of the night.",
      storyImage1Url: frame(25),
      storyImage2Url: frame(16),
      marquee: [
        "Filter Coffee",
        "Mirchi Bajji",
        "Pani Puri",
        "Maska Bun",
        "Fresh Juice",
        "Milkshakes",
        "Custom Cakes",
      ],
    },
  });

  // ---- Categories ---------------------------------------------------------
  const catIds = {};
  for (const [i, c] of data.categories.entries()) {
    const row = await db.category.upsert({
      where: { slug: c.id },
      update: { label: c.label, order: i },
      create: { slug: c.id, label: c.label, order: i },
    });
    catIds[c.id] = row.id;
  }

  // ---- Menu ---------------------------------------------------------------
  for (const [i, m] of data.menu.entries()) {
    await db.menuItem.upsert({
      where: { slug: m.id },
      update: {},
      create: {
        slug: m.id,
        name: m.name,
        tamil: m.tamil,
        price: m.price,
        blurb: m.blurb,
        accent: m.accent,
        tags: m.tags ?? [],
        order: i,
        time: m.time,
        serves: m.serves,
        level: m.level,
        ingredients: m.ingredients,
        steps: m.steps,
        note: m.note,
        categoryId: catIds[m.cat],
      },
    });
  }

  // ---- Recipes ------------------------------------------------------------
  // Filled in separately from the menu rows above, and only where the dish has
  // no method yet. Anything edited in the admin panel is left alone, so
  // re-running the seed on a deploy never overwrites the counter's own wording.
  let filled = 0;
  for (const [slug, rec] of Object.entries(RECIPES)) {
    const dish = await db.menuItem.findUnique({
      where: { slug },
      select: { id: true, steps: true, note: true },
    });
    // Steps alone is not enough of a test: the bottled drinks legitimately have
    // none, so checking only that re-wrote those five on every single run and
    // would have discarded the owner's edits to them on each deploy.
    if (!dish || dish.steps.length || dish.note) continue;
    await db.menuItem.update({ where: { id: dish.id }, data: rec });
    filled++;
  }
  if (filled) console.log(`  recipes filled in: ${filled}`);

  // ---- Journal ------------------------------------------------------------
  for (const p of data.posts) {
    await db.post.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        slug: p.slug,
        title: p.title,
        category: p.cat,
        excerpt: p.excerpt,
        readMins: p.read,
        imageUrl: "/" + p.img,
        body: p.body,
        publishedAt: new Date(p.date),
      },
    });
  }

  // The opening set of posts. `update: {}` means an existing slug is left
  // exactly as the owner edited it — re-running the seed never rewrites them.
  let wrote = 0;
  for (const post of POSTS) {
    const before = await db.post.findUnique({ where: { slug: post.slug } });
    if (before) continue;
    await db.post.create({ data: post });
    wrote++;
  }
  if (wrote) console.log(`  journal posts added: ${wrote}`);

  // ---- Cake options -------------------------------------------------------
  const cake = data.cake;
  const put = (kind, key, fields) =>
    db.cakeOption.upsert({
      where: { kind_key: { kind, key } },
      update: {},
      create: { kind, key, ...fields },
    });

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

  // ---- Packages -----------------------------------------------------------
  for (const [i, p] of cake.packages.entries()) {
    const existing = await db.package.findFirst({ where: { name: p.name } });
    if (!existing) {
      await db.package.create({
        data: {
          name: p.name,
          price: p.price,
          unit: p.unit,
          items: p.items,
          hero: !!p.hero,
          order: i,
        },
      });
    }
  }

  // ---- Terms & Privacy ----------------------------------------------------
  // Upsert-on-create only, so edits made in the admin panel are never
  // overwritten by a redeploy.
  const settings = await db.settings.findUnique({ where: { id: 1 } });
  for (const page of LEGAL_PAGES(settings)) {
    await db.page.upsert({
      where: { slug: page.slug },
      update: {},
      create: page,
    });
  }

  const counts = {
    categories: await db.category.count(),
    menu: await db.menuItem.count(),
    posts: await db.post.count(),
    cakeOptions: await db.cakeOption.count(),
    packages: await db.package.count(),
    pages: await db.page.count(),
  };
  console.log("    seeded:", JSON.stringify(counts));
}

main()
  .catch((e) => {
    console.error("Seed failed:", e.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
