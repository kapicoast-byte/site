import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/**
 * robots.txt.
 *
 * The admin panel and the file-serving route are kept out of the index. Neither
 * is secret — /admin redirects to a login and the uploads route only streams
 * images — but neither belongs in search results either.
 */
/**
 * Rendered per request, not at build time.
 *
 * Without this, Next evaluates this file during `next build` and bakes the
 * result into the image. SITE_URL is a runtime variable — Dokploy supplies it
 * to the container, not to the builder — so `siteUrl()` fell back to its
 * localhost default and the deployed robots.txt advertised
 * `Sitemap: http://localhost:3000/sitemap.xml` to every crawler that asked.
 *
 * sitemap.ts never had the problem only because it awaits Firestore, which
 * forces it dynamic as a side effect. Relying on that is luck, not design.
 */
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
