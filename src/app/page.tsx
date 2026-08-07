import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings, hoursOf } from "@/lib/settings";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Marquee from "@/components/Marquee";
import VideoHero from "@/components/VideoHero";
import MapEmbed from "@/components/MapEmbed";
import CakeShowpiece from "@/components/CakeShowpiece";

export const dynamic = "force-dynamic";

const rupee = (n: number) => "₹" + n.toLocaleString("en-IN");

export default async function Home() {
  const s = await getSettings();

  const [featured, posts] = await Promise.all([
    db.menuItem.findMany({
      where: { published: true, tags: { has: "star" } },
      orderBy: { order: "asc" },
      take: 4,
    }),
    db.post.findMany({
      where: { published: true },
      orderBy: { publishedAt: "desc" },
      take: 3,
    }),
  ]);

  const hours = hoursOf(s);
  const today = new Date().getDay(); // 0 = Sunday

  return (
    <>
      <Nav logoUrl={s.logoDarkUrl} tamilName={s.tamilName} />

      <main id="main">
        <VideoHero
          videoUrl={s.heroVideoUrl}
          posterUrl={s.heroPosterUrl}
          cafeName={s.cafeName}
          tamilName={s.tamilName}
          tagline={s.tagline}
          line1={s.heroLine1}
          line2={s.heroLine2}
          eyebrow={s.heroEyebrow}
          badge={s.heroBadge}
          trust={s.heroTrust}
          side={s.heroSide}
        />

        <Marquee items={s.marquee} />

        {/* ---------------------------------------------------- story ---- */}
        <section className="section on-cream">
          <div className="wrap story">
            <div>
              <p className="eyebrow">About us</p>
              <h2>Coffee, chai and<br />street eats, made<br />to order.</h2>

              {/* The About Us intro always shows. */}
              <p className="lede" style={{ marginTop: "1.4rem" }}>
                Filter coffee brewed through the day, chai boiled to order and
                snacks fried when you ask for them. A place to sit for ten
                minutes or an hour, on the way to somewhere or not.
              </p>

              {/* Then the owner. The card appears as soon as there is a
                  picture, so the section is never a blank space — but the quote
                  and the name only appear once they have actually been written.
                  Nothing is published under a real person's name unless that
                  person typed it. Both are set in Admin -> Site settings. */}
              {(s.ownerNote || s.ownerPhotoUrl) && (
                <figure className="ownercard">
                  {s.ownerPhotoUrl ? (
                    // width/height are 4:5, matching the CSS frame — they
                    // reserve the right shape before the stylesheet or the file
                    // has loaded, so the page does not jolt when the portrait
                    // arrives.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className="ownercard__face"
                      src={s.ownerPhotoUrl}
                      alt={s.ownerName ? `${s.ownerName}, ${s.ownerRole}` : s.ownerRole}
                      width={264}
                      height={330}
                      loading="lazy"
                    />
                  ) : (
                    <span className="ownercard__face ownercard__face--blank" aria-hidden="true" />
                  )}
                  <div className="ownercard__body">
                    {/* Guarded: the quote marks are pseudo-elements, so an
                        empty blockquote would still paint a bare “” . */}
                    {s.ownerNote && (
                      <blockquote className="ownernote">{s.ownerNote}</blockquote>
                    )}
                    <figcaption className="ownersig">
                      {s.ownerName && <b>{s.ownerName}</b>}
                      <small>{s.ownerRole}</small>
                    </figcaption>
                  </div>
                </figure>
              )}

              <p style={{ marginTop: "2rem" }}>
                <Link className="tlink" href="/journal">Read the journal →</Link>
              </p>
            </div>

            <div className="story__stack">
              <span className="story__badge">{s.heroBadge}</span>
              {s.storyImage1Url && (
                <div className="story__img">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.storyImage1Url} alt="Inside the cafe" loading="lazy" />
                </div>
              )}
              {s.storyImage2Url && (
                <div className="story__img story__img--float">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.storyImage2Url} alt="The counter" loading="lazy" />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------- featured ---- */}
        {featured.length > 0 && (
          <section className="section">
            <div className="wrap">
              <div className="head-row">
                <div>
                  <p className="eyebrow">What people order</p>
                  <h2>What we&apos;re<br />known for.</h2>
                </div>
                <p className="lede" style={{ maxWidth: "34ch" }}>
                  Every dish on our menu comes with the actual recipe. Tap any
                  item to read it.
                </p>
              </div>

              <div className="grid grid--4">
                {featured.map((m) => (
                  <Link className="card" key={m.id} href={`/menu#${m.slug}`}>
                    <div
                      className="card__media poster"
                      style={{ ["--a" as string]: m.accent }}
                    >
                      <span className="card__tag">{rupee(m.price)}</span>
                      {m.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.imageUrl} alt={m.name} loading="lazy" />
                      ) : (
                        <>
                          <span className="poster__steam" />
                          <span className="poster__ta tamil">{m.tamil}</span>
                        </>
                      )}
                    </div>
                    <div className="card__body">
                      <h3>{m.name}</h3>
                      <p style={{ fontSize: "var(--fs-sm)", color: "var(--cream-dim)", flex: 1 }}>
                        {m.blurb}
                      </p>
                      <span className="mitem__cta" style={{ margin: 0 }}>
                        Read the recipe →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              <p style={{ marginTop: "2.5rem" }}>
                <Link className="btn btn--ghost" href="/menu">
                  Full menu &amp; every recipe →
                </Link>
              </p>
            </div>
          </section>
        )}

        {/* Cakes only — this band sits directly above the cake section, and
            "High tea" and "Office drops on OMR" belonged to neither.

            Every line is something the site already commits to elsewhere, not a
            claim written to fill the space: eggless pricing and the OMR
            delivery area from the cakes page, the 48-hour minimum and the 8 am
            collection slot from the builder's own date picker, and the hand-
            piped message from its 40-character limit. Nothing here describes a
            flavour or a texture, because no cake options exist yet to describe;
            "rich", "decadent" and "freshly baked" would be filler. */}
        <Marquee
          red
          items={[
            "Eggless at no extra charge",
            "Writing piped by hand",
            "Collection from 8 am",
            "48 hours' notice",
            "Delivered along OMR",
          ]}
        />

        {/* ---------------------------------------------------- cakes ---- */}
        <section className="section">
          <div className="wrap grid grid--2" style={{ alignItems: "center" }}>
            <div>
              <p className="eyebrow">Parties &amp; events</p>
              <h2>We&apos;ll bake the<br />middle of your<br /><span className="gold">celebration.</span></h2>
              <p className="lede" style={{ marginTop: "1.4rem" }}>
                Built to your size, your flavour and your Chennai weather. Plus
                high tea, chaat counters and office drops anywhere along OMR.
              </p>
              <p style={{ marginTop: "2rem", display: "flex", gap: ".7rem", flexWrap: "wrap" }}>
                <Link className="btn btn--red" href="/cakes#builder">Build your cake</Link>
                <Link className="btn btn--ghost" href="/cakes#packages">Event packages</Link>
              </p>
            </div>

            <CakeShowpiece />
          </div>
        </section>

        {/* -------------------------------------------------- journal ---- */}
        {posts.length > 0 && (
          <section className="section on-cream">
            <div className="wrap">
              <div className="head-row">
                <div>
                  <p className="eyebrow">From the counter</p>
                  <h2>The journal.</h2>
                </div>
                <Link className="tlink" href="/journal">All posts →</Link>
              </div>
              <div className="grid grid--3">
                {posts.map((p) => (
                  <Link
                    className="card"
                    key={p.id}
                    href={`/journal/${p.slug}`}
                    style={{ background: "var(--milk)", borderColor: "rgba(16,12,8,.14)" }}
                  >
                    {p.imageUrl && (
                      <div className="card__media">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.imageUrl} alt="" loading="lazy" />
                      </div>
                    )}
                    <div className="card__body">
                      <div className="pmeta" style={{ color: "#7A6851" }}>
                        <span className="cat" style={{ color: "var(--kumkum)" }}>{p.category}</span>
                        <span className="sep">·</span>
                        <span>{p.readMins} min read</span>
                      </div>
                      <h3 style={{ color: "var(--ink)" }}>{p.title}</h3>
                      <p style={{ fontSize: "var(--fs-sm)", color: "#5A4A38", flex: 1 }}>
                        {p.excerpt}
                      </p>
                      <span className="mitem__cta" style={{ margin: 0, color: "var(--kumkum)" }}>
                        Read →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ---------------------------------------------------- visit ---- */}
        <section className="section">
          <div className="wrap">
            <div className="head-row">
              <div>
                <p className="eyebrow">Come over</p>
                <h2>{s.addressL1}.</h2>
              </div>
            </div>
            <div className="map-grid">
              <MapEmbed query={s.mapsQuery} />
              <div style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
                <div className="infocard">
                  <h3>{s.cafeName}</h3>
                  <address>
                    {s.addressL1}<br />{s.addressL2}<br />{s.addressL3}
                  </address>
                  <p style={{ display: "flex", gap: ".6rem", flexWrap: "wrap", marginTop: ".4rem" }}>
                    <a
                      className="btn"
                      target="_blank"
                      rel="noopener"
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(s.mapsQuery)}`}
                    >
                      Directions
                    </a>
                    <Link className="btn btn--ghost" href="/visit">Hours &amp; contact</Link>
                  </p>
                </div>
                <div className="hours">
                  {hours.map((h, i) => (
                    <div key={h.day} className={(i + 1) % 7 === today ? "is-today" : ""}>
                      <span>{h.day}</span>
                      <span>{h.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer s={s} />
    </>
  );
}
