import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/**
 * robots.txt.
 *
 * The admin panel and the file-serving route are kept out of the index. Neither
 * is secret — /admin redirects to a login and the uploads route only streams
 * images — but neither belongs in search results either.
 */
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
