import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import Nav from "@/components/Nav";
import Valance from "@/components/Valance";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Journal — Kapi Coast",
  description: "Notes from behind the Kapi Coast counter.",
};

const fmt = (d: Date) =>
  d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

export default async function JournalPage() {
  const [s, posts] = await Promise.all([
    getSettings(),
    db.post.findMany({ where: { published: true }, orderBy: { publishedAt: "desc" } }),
  ]);

  const [lead, ...rest] = posts;

  return (
    <>
      <Nav logoUrl={s.logoDarkUrl} tamilName={s.tamilName} />

      <main id="main">
        <section className="pagehead">
          <Valance />
          <div className="pagehead__ghost tamil" aria-hidden="true">குறிப்பு</div>
          <div className="wrap">
            <p className="eyebrow">Notes from the counter</p>
            <h1 style={{ fontSize: "clamp(2.8rem,8vw,6rem)", marginTop: ".6rem" }}>
              The <span className="gold">journal.</span>
            </h1>
          </div>
        </section>

        {lead && (
          <section className="section section--tight">
            <div className="wrap">
              <Link className="feature" href={`/journal/${lead.slug}`}>
                {lead.imageUrl && (
                  <div className="feature__media">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={lead.imageUrl} alt="" />
                  </div>
                )}
                <div className="feature__body">
                  <div className="pmeta">
                    <span className="cat">{lead.category}</span>
                    <span className="sep">·</span>
                    <span>{fmt(lead.publishedAt)}</span>
                    <span className="sep">·</span>
                    <span>{lead.readMins} min read</span>
                  </div>
                  <h2 style={{ fontSize: "clamp(1.9rem,3.4vw,3rem)" }}>{lead.title}</h2>
                  <p className="lede">{lead.excerpt}</p>
                  <span className="tlink gold">Read the piece →</span>
                </div>
              </Link>
            </div>
          </section>
        )}

        {rest.length > 0 && (
          <section className="section section--tight">
            <div className="wrap">
              <div className="head-row">
                <div>
                  <p className="eyebrow">Everything else</p>
                  <h2>More reading.</h2>
                </div>
              </div>
              <div className="grid grid--3">
                {rest.map((p) => (
                  <Link className="card" key={p.id} href={`/journal/${p.slug}`}>
                    {p.imageUrl && (
                      <div className="card__media">
                        <span className="card__tag">{p.category}</span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.imageUrl} alt="" loading="lazy" />
                      </div>
                    )}
                    <div className="card__body">
                      <div className="pmeta">
                        <span>{fmt(p.publishedAt)}</span>
                        <span className="sep">·</span>
                        <span>{p.readMins} min</span>
                      </div>
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

        {posts.length === 0 && (
          <section className="section">
            <div className="wrap">
              <p className="lede">No posts yet. Add one from the admin panel.</p>
            </div>
          </section>
        )}
      </main>

      <Footer s={s} />
    </>
  );
}
