/**
 * The site's public address.
 *
 * Sitemaps, robots.txt and llms.txt all have to emit absolute URLs, and a
 * relative one is silently useless in every case. Set SITE_URL in Dokploy to
 * the real domain; the fallback only keeps local development working.
 */
export function siteUrl(): string {
  const raw = process.env.SITE_URL || "http://localhost:3000";
  // Trailing slashes turn into "//menu" once anything is appended.
  return raw.replace(/\/+$/, "");
}
