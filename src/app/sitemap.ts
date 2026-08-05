import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/site";

/**
 * Sitemap for Google Search Console, generated from the database.
 *
 * Built at request time rather than written by hand, so a dish added in the
 * admin panel is in the sitemap immediately and nobody has to remember to
 * update a list. Only published rows are included — an unpublished post in a
 * sitemap is an invitation for Google to crawl a 404.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  const [posts, pages, menuUpdated] = await Promise.all([
    db.post.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
      orderBy: { publishedAt: "desc" },
    }),
    db.page.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    }),
    db.menuItem.findFirst({
      where: { published: true },
      select: { updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const now = new Date();

  const fixed: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    {
      url: `${base}/menu`,
      // The menu page changes whenever any dish does.
      lastModified: menuUpdated?.updatedAt ?? now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    { url: `${base}/cakes`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/visit`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/journal`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
  ];

  return [
    ...fixed,
    ...posts.map((p) => ({
      url: `${base}/journal/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "yearly" as const,
      priority: 0.5,
    })),
    ...pages.map((p) => ({
      url: `${base}/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
