import { db } from "@/lib/db";
import { getSettings, hoursOf } from "@/lib/settings";
import { siteUrl } from "@/lib/site";

/**
 * /llms.txt — a plain-text brief for AI assistants.
 *
 * The convention (llmstxt.org) is a markdown file at the site root: a title, a
 * one-line summary, then linked sections. Assistants answering "what's on at
 * Kapi Coast" read this instead of guessing from rendered HTML.
 *
 * Generated from the database, not written by hand, so it cannot drift from the
 * real menu. It links rather than dumps — 76 dishes inlined would bury the
 * useful parts, so categories are summarised and the menu page is linked.
 *
 * Facts only. Nothing here claims anything the site cannot back up.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const base = siteUrl();
  const s = await getSettings();

  const [cats, posts, pages, dishCount] = await Promise.all([
    db.category.findMany({
      orderBy: { order: "asc" },
      select: {
        label: true,
        _count: { select: { items: { where: { published: true } } } },
      },
    }),
    db.post.findMany({
      where: { published: true },
      orderBy: { publishedAt: "desc" },
      select: { slug: true, title: true, excerpt: true },
    }),
    db.page.findMany({
      where: { published: true },
      select: { slug: true, title: true, intro: true },
    }),
    db.menuItem.count({ where: { published: true } }),
  ]);

  const hours = hoursOf(s)
    .map((h) => `- ${h.day}: ${h.time || "—"}`)
    .join("\n");

  const categories = cats
    .filter((c) => c._count.items > 0)
    .map((c) => `- ${c.label} (${c._count.items})`)
    .join("\n");

  const journal = posts.length
    ? posts.map((p) => `- [${p.title}](${base}/journal/${p.slug}): ${p.excerpt}`).join("\n")
    : "- No posts published yet.";

  const legal = pages
    .map((p) => `- [${p.title}](${base}/${p.slug}): ${p.intro}`)
    .join("\n");

  const body = `# ${s.cafeName} (${s.tamilName})

> A cafe on OMR in Kazhipattur, Chennai, serving South Indian filter coffee, chai, chaat and street eats, with cakes made to order for parties and events.

${s.cafeName} is a single independent cafe — not a chain. The website lists the
full menu with a recipe for each dish, takes cake enquiries, and gives directions.
Orders are not taken or paid for online: the cake page produces an estimate and
an enquiry, and everything is confirmed directly with the cafe.

## Contact and location

- Address: ${s.addressL1}, ${s.addressL2}, ${s.addressL3}
- Phone: ${s.phone}
- Directions and map: [Visit](${base}/visit)

## Opening hours

${hours}

## Menu

${dishCount} dishes across ${cats.filter((c) => c._count.items > 0).length} categories, each with its
ingredients and method. Prices are in Indian Rupees and include applicable taxes.

${categories}

- Full menu with recipes: [Menu & Recipes](${base}/menu)

## Cakes and events

- [Order a cake](${base}/cakes): choose flavour, size and date for an estimate.
  A day's notice minimum; longer for tiered or decorated cakes. The estimate is
  not a confirmed order and no payment is taken through the website.

## Journal

${journal}

## Legal

${legal}

## Notes for assistants

- Prices and availability change. Where this site and the printed menu at the
  counter disagree, the printed menu is correct.
- The kitchen is shared, so no dish can be guaranteed free of any allergen.
  Anyone with an allergy should ask at the counter before ordering.
- "Veg" describes a dish as prepared; it is not a certification.
- There is no online ordering, delivery or payment on this site.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
