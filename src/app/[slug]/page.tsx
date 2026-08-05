import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

/**
 * Standalone content pages — /privacy, /terms, and anything else added in the
 * admin panel. Sits last in the routing order, so it only catches slugs the
 * named routes above it don't already own.
 */

type Block =
  | { t: "p" | "h" | "q"; c: string }
  | { t: "ul"; c: string[] };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await db.page.findUnique({ where: { slug } });
  if (!page) return { title: "Not found — Kapi Coast" };
  return {
    title: `${page.title} — Kapi Coast`,
    description: page.intro,
    // Legal pages are for people who look for them, not for search traffic.
    robots: { index: true, follow: true },
  };
}

function renderBlock(b: Block, i: number) {
  if (b.t === "h") return <h3 key={i}>{b.c}</h3>;
  if (b.t === "q") return <blockquote key={i}>{b.c}</blockquote>;
  if (b.t === "ul")
    return (
      <ul key={i}>
        {b.c.map((li, j) => (
          <li key={j}>{li}</li>
        ))}
      </ul>
    );
  return <p key={i}>{b.c}</p>;
}

export default async function ContentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [s, page] = await Promise.all([
    getSettings(),
    db.page.findUnique({ where: { slug } }),
  ]);

  if (!page || !page.published) notFound();

  const body = (page.body as unknown as Block[]) ?? [];
  const updated = page.updatedAt.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <Nav logoUrl={s.logoDarkUrl} tamilName={s.tamilName} />

      <main id="main" className="article">
        <article className="article__wrap">
          <p className="eyebrow">Legal</p>
          <h1 style={{ fontSize: "clamp(2.1rem,5.5vw,3.4rem)", marginTop: ".7rem" }}>
            {page.title}
          </h1>
          {page.intro && (
            <p className="lede" style={{ marginTop: "1.1rem" }}>{page.intro}</p>
          )}
          <p className="pmeta" style={{ marginTop: "1.2rem" }}>
            <span>Last updated {updated}</span>
          </p>

          <div className="prose" style={{ marginTop: "2.4rem" }}>
            {body.map(renderBlock)}
          </div>
        </article>
      </main>

      <Footer s={s} />
    </>
  );
}
