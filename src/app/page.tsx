import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings, hoursOf } from "@/lib/settings";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Marquee from "@/components/Marquee";
import VideoHero from "@/components/VideoHero";
import MapEmbed from "@/components/MapEmbed";
import CakeShowpiece from "@/components/CakeShowpiece";
import BrandStrip from "@/components/BrandStrip";
import ImageStreamHero from "@/components/ImageStreamHero";

export const dynamic = "force-dynamic";

const rupee = (n: number) => "₹" + n.toLocaleString("en-IN");

export default async function Home() {
  const s = await getSettings();

  const [dishes, posts] = await Promise.all([
    /* Every published dish, not the four starred ones: the corridor cycles
       through whatever it is given, so the more photos there are the longer it
       runs before a card repeats. */
    db.menuItem.findMany({
      where: { published: true },
      orderBy: { order: "asc" },
    }),
    db.post.findMany({
      where: { published: true },
      orderBy: { publishedAt: "desc" },
      take: 3,
    }),
  ]);

  /* A dish with no photo would ride the rails as an empty card, so the
     corridor only ever sees the ones that have an image. */
  const withPhotos = dishes.filter((m) => m.imageUrl);

  /* The corridor holds `cards` at a time and indexes them positionally, so
     handing it all 76 in menu order would only ever show the first few — which
     are the hot drinks, and the rails would run three near-identical glasses of
     tea. Sampling at an even stride across the whole menu instead puts a
     coffee, a juice, a bajji and a cake on the rails at once. */
  const STREAM_CARDS = 12;
  const stride = Math.max(1, Math.floor(withPhotos.length / STREAM_CARDS));
  const streamImages = Array.from(
    { length: Math.min(STREAM_CARDS, withPhotos.length) },
    (_, i) => withPhotos[(i * stride) % withPhotos.length],
  ).map((m) => ({ src: m.imageUrl as string, alt: m.name }));

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
          badge={s.heroBadge}
          trust={s.heroTrust}
          side={s.heroSide}
        />

        {/* The number in the band is the thing you press, not a number to retype. */}
        <Marquee items={s.marquee} whatsapp={s.whatsapp} />

        {/* ------------------------------------------------- the stream ----
            Was a grid of four starred dishes. The corridor runs the whole
            menu instead, so the section shows what the kitchen actually makes
            rather than a sample of it. Decorative and aria-hidden inside the
            component; the heading and the link carry the meaning, and the
            menu itself is one press away. */}
        {streamImages.length > 0 && (
          <section className="section section--flush">
            <ImageStreamHero
              className="stream--dishes"
              images={streamImages}
              cards={12}
              speed={22}
              axis={52}
            >
              <span className="stream__veil" aria-hidden />
              <div className="wrap stream__over">
                <p className="eyebrow">What people order</p>
                <h2>What we&apos;re<br />known for.</h2>
                <p className="lede lede--short">
                  Every dish on our menu comes with the actual recipe. Tap any
                  item to read it.
                </p>
                <p className="grid__after">
                  <Link className="btn btn--ghost" href="/menu">
                    Full menu &amp; every recipe →
                  </Link>
                </p>
              </div>
            </ImageStreamHero>
          </section>
        )}

        {/* Cakes only — this band sits directly above the cake section, and
            "High tea" and "Office drops on OMR" belonged to neither.

            "Call for flavours" is deliberate, not a placeholder. No flavour
            list exists anywhere — cakeOptions is empty — so naming one would
            send someone to the counter to order a cake nobody agreed to bake.
            Pointing at the phone is the one honest thing the band can say about
            types, and it is still useful: it asks for the call rather than
            hoping for it.

            The rest are commitments the site already makes elsewhere, so a
            customer can hold the cafe to each: the 48-hour minimum from the
            builder's date picker, eggless pricing from the cakes page, and
            "Parties & events" from this section's own heading. Nothing
            describes a taste or a texture, because "rich" and "freshly baked"
            are filler nobody can be held to. */}
        <Marquee
          red
          items={[
            "Order yours",
            "Call for flavours",
            "48 hours' notice",
            "Parties & events",
            "Eggless at no extra charge",
          ]}
        />

        {/* ---------------------------------------------------- cakes ---- */}
        <section className="section">
          <div className="wrap grid grid--2 grid--middle">
            <div>
              <p className="eyebrow">Parties &amp; events</p>
              <h2>We&apos;ll bake the<br />middle of your<br /><span className="gold">celebration.</span></h2>
              <p className="lede lede--spaced">
                Built to your size, your flavour and your Chennai weather. Plus
                high tea, chaat counters and office drops anywhere along OMR.
              </p>
              <p className="btnrow">
                <Link className="btn btn--red" href="/cakes#builder">Build your cake</Link>
                <Link className="btn btn--ghost" href="/cakes#packages">Event packages</Link>
              </p>
            </div>

            <CakeShowpiece />
          </div>
        </section>

        {/* ---------------------------------------------------- about ---- */}
        {/* Built as a spread rather than a block: heading and copy set against
            each other at the top, the photography full-bleed across the page,
            then the owner at the same scale as everything else. Boxed into one
            half of a two-column grid, this read as a widget on a page; the
            width is what makes it a page. */}
        <section className="section on-cream about">
          <div className="wrap about__head">
            <div>
              <p className="eyebrow">About us</p>
              <h2 className="about__title">
                Open at six.<br />Filter coffee from<br />the first hour.
              </h2>
            </div>

            {/* Everything here is something the site already stands behind: the
                6 am opening from the hours, filter coffee and boiled chai from
                the menu, bajji and bonda from the evening counter, OMR from the
                address. No invented detail. */}
            <div className="about__copy">
              <p>
                The decoction is dripping before the road outside is properly
                awake. Chai gets boiled to order rather than kept warm in an
                urn. Bajji and bonda go into the oil when you ask for them,
                which is why they take a few minutes and why they are worth the
                few minutes.
              </p>
              <p>
                Nobody gets moved along. Some people stop for ten minutes on the
                way down OMR; some settle in for an hour and a second cup. The
                place works either way.
              </p>
            </div>
          </div>

          {/* Edge to edge. The two pictures were a boxed image and a small one
              tucked over its corner — a decoration beside the text. At full
              width they are the room itself. */}
          {(s.storyImage1Url || s.storyImage2Url) && (
            <div className="about__gallery">
              {s.storyImage1Url && (
                <figure>
                  <span className="about__badge">{s.heroBadge}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.storyImage1Url} alt="Inside the cafe" loading="lazy" />
                </figure>
              )}
              {s.storyImage2Url && (
                <figure>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.storyImage2Url} alt="The counter" loading="lazy" />
                </figure>
              )}
            </div>
          )}

          {/* The owner, at the page's scale rather than tucked under a column.
              The name and role show as soon as there is a picture; the note only
              once it has been written. Both are set in Admin -> Site settings. */}
          {(s.ownerNote || s.ownerPhotoUrl) && (
            <div className="wrap">
              <figure className="ownercard">
                <div className="ownercard__body">
                  {s.ownerName && <p className="ownercard__name">{s.ownerName}</p>}
                  {/* Guarded: an empty blockquote would still paint its
                      pseudo-element quote marks as a bare “” . */}
                  {s.ownerNote && (
                    <blockquote className="ownernote">{s.ownerNote}</blockquote>
                  )}
                  <figcaption className="ownersig">
                    <small>{s.ownerRole}</small>
                  </figcaption>
                </div>

                {s.ownerPhotoUrl ? (
                  // width/height are 4:5, reserving the right shape before the
                  // stylesheet or the file has loaded so the page does not jolt.
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
              </figure>
            </div>
          )}

          {/* Renders nothing until brands exist in Site settings. */}
          <BrandStrip brands={s.brands} title="Brands we own" />
        </section>

        {/* -------------------------------------------------- journal ---- */}
        {posts.length > 0 && (
          <section className="section on-cream">
            <div className="wrap wrap--wide">
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
                    className="card card--paper"
                    key={p.id}
                    href={`/journal/${p.slug}`}
                  >
                    {p.imageUrl && (
                      <div className="card__media">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.imageUrl} alt="" loading="lazy" />
                      </div>
                    )}
                    <div className="card__body">
                      <div className="pmeta">
                        <span className="cat">{p.category}</span>
                        <span className="sep">·</span>
                        <span>{p.readMins} min read</span>
                      </div>
                      <h3>{p.title}</h3>
                      <p className="card__excerpt">{p.excerpt}</p>
                      <span className="mitem__cta">Read →</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ---------------------------------------------------- visit ---- */}
        <section className="section">
          <div className="wrap wrap--wide">
            <div className="head-row">
              <div>
                <p className="eyebrow">Come over</p>
                <h2>{s.addressL1}.</h2>
              </div>
            </div>
            <div className="map-grid">
              <MapEmbed query={s.mapsQuery} />
              <div className="visit__aside">
                <div className="infocard">
                  <h3>{s.cafeName}</h3>
                  <address>
                    {s.addressL1}<br />{s.addressL2}<br />{s.addressL3}
                  </address>
                  <div className="infocard__actions">
                    <a
                      className="btn"
                      target="_blank"
                      rel="noopener"
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(s.mapsQuery)}`}
                    >
                      Directions
                    </a>
                    {s.phone && (
                        <a className="btn btn--ghost" href={`tel:${s.phone.replace(/[^0-9+]/g, "")}`}>
                          {s.phone}
                        </a>
                      )}
                      <Link className="tlink" href="/visit">Hours &amp; contact →</Link>
                    </div>
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
