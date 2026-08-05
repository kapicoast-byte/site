import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

type Block =
  | { t: "p" | "h" | "q"; c: string }
  | { t: "ul"; c: string[] };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await db.post.findUnique({ where: { slug } });
  if (!post) return { title: "Not found — Kapi Coast" };
  return { title: `${post.title} — Kapi Coast Journal`, description: post.excerpt };
}

const fmt = (d: Date) =>
  d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

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

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [s, post] = await Promise.all([
    getSettings(),
    db.post.findUnique({ where: { slug } }),
  ]);

  if (!post || !post.published) notFound();

  const related = await db.post.findMany({
    where: { published: true, slug: { not: post.slug } },
    orderBy: { publishedAt: "desc" },
    take: 3,
  });

  const body = (post.body as unknown as Block[]) ?? [];

  return (
    <>
      <Nav logoUrl={s.logoDarkUrl} tamilName={s.tamilName} />

      <main id="main" className="article">
        <article className="article__wrap">
          <p><Link className="tlink" href="/journal">← Back to the journal</Link></p>

          <div className="pmeta" style={{ marginTop: "1.8rem" }}>
            <span className="cat">{post.category}</span>
            <span className="sep">·</span>
            <span>{fmt(post.publishedAt)}</span>
            <span className="sep">·</span>
            <span>{post.readMins} min read</span>
          </div>

          <h1 style={{ fontSize: "clamp(2.1rem,5.5vw,3.6rem)", marginTop: ".9rem" }}>
            {post.title}
          </h1>
          <p className="lede" style={{ marginTop: "1.1rem" }}>{post.excerpt}</p>

          {post.imageUrl && (
            <div className="article__hero">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.imageUrl} alt="" />
            </div>
          )}

          <div className="prose">{body.map(renderBlock)}</div>

          <div className="note" style={{ marginTop: "3rem" }}>
            <b>Come and taste the difference</b>
            We&apos;re at {s.addressL1}.
            <span style={{ display: "flex", gap: ".6rem", flexWrap: "wrap", marginTop: "1rem" }}>
              <Link className="btn" href="/menu">See the menu</Link>
              <Link className="btn btn--ghost" href="/visit">Get directions</Link>
            </span>
          </div>
        </article>

        {related.length > 0 && (
          <section className="section">
            <div className="wrap">
              <div className="head-row">
                <div>
                  <p className="eyebrow">Keep reading</p>
                  <h2>More from the journal.</h2>
                </div>
                <Link className="tlink" href="/journal">All posts →</Link>
              </div>
              <div className="grid grid--3">
                {related.map((p) => (
                  <Link className="card" key={p.id} href={`/journal/${p.slug}`}>
                    {p.imageUrl && (
                      <div className="card__media">
                        <span className="card__tag">{p.category}</span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.imageUrl} alt="" loading="lazy" />
                      </div>
                    )}
                    <div className="card__body">
                      <div className="pmeta"><span>{p.readMins} min read</span></div>
                      <h3>{p.title}</h3>
                      <p style={{ fontSize: "var(--fs-sm)", color: "var(--cream-dim)", flex: 1 }}>
                        {p.excerpt}
                      </p>
                      <span className="mitem__cta" style={{ margin: 0 }}>Read →</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer s={s} />
    </>
  );
}
