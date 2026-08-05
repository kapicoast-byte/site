import type { Metadata } from "next";
import { getSettings, hoursOf } from "@/lib/settings";
import Nav from "@/components/Nav";
import Valance from "@/components/Valance";
import Footer from "@/components/Footer";
import MapEmbed from "@/components/MapEmbed";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Visit — Kapi Coast, OMR Chennai",
  description: "Map, directions, parking, hours and contact for Kapi Coast on OMR.",
};

/**
 * Photographs of the cafe itself, cut from the walkthrough video.
 *
 * These used to be pulled from the media library with `mimeType: "image/*"`,
 * which meant *any* uploaded image landed here — the first dish photo uploaded
 * put a plate of samosas under the heading "what it looks like when you get
 * here". The media library has no notion of what a picture is *of*, so it was
 * never the right source for this. A named list is.
 *
 * To change them, replace the files in public/space/ — same names, same 2:3
 * shape — or ask for an admin picker.
 */
const SPACE_SHOTS = [
  { src: "/space/shopfront.webp", alt: "The Kapi Coast shopfront on OMR, sign lit above the counter" },
  { src: "/space/counter.webp", alt: "Watermelon, pineapple and papaya racked above the filter coffee urn" },
  { src: "/space/bakery.webp", alt: "The bakery case with buns and puffs, menu boards above the counter" },
  { src: "/space/seating.webp", alt: "Tables and chairs outside, under the decorated window" },
];

export default async function VisitPage() {
  const s = await getSettings();
  const hours = hoursOf(s);
  const today = new Date().getDay();

  return (
    <>
      <Nav logoUrl={s.logoDarkUrl} tamilName={s.tamilName} />

      <main id="main">
        <section className="pagehead">
          <Valance />
          <div className="pagehead__ghost tamil" aria-hidden="true">வாங்க</div>
          <div className="wrap">
            <p className="eyebrow">{s.heroEyebrow}</p>
            <h1 style={{ fontSize: "clamp(2.7rem,7.5vw,5.6rem)", marginTop: ".6rem" }}>
              {s.addressL1}.<br /><span className="gold">Come over.</span>
            </h1>
            <p style={{ marginTop: "1.8rem", display: "flex", gap: ".7rem", flexWrap: "wrap" }}>
              <a
                className="btn"
                target="_blank"
                rel="noopener"
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(s.mapsQuery)}`}
              >
                Get directions
              </a>
              <a className="btn btn--ghost" href={`tel:${s.phone.replace(/\s/g, "")}`}>
                Call the counter
              </a>
            </p>
          </div>
        </section>

        <section className="section section--tight">
          <div className="wrap map-grid">
            <MapEmbed query={s.mapsQuery} />

            <div style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
              <div className="infocard">
                <p className="eyebrow no-rule">The address</p>
                <h3>{s.cafeName} · <span className="tamil">{s.tamilName}</span></h3>
                <address>
                  {s.addressL1}<br />{s.addressL2}<br />{s.addressL3}
                </address>
                <div style={{ display: "grid", gap: ".55rem", marginTop: ".6rem", fontSize: "var(--fs-sm)" }}>
                  <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="gold">{s.phone}</a>
                  {s.email && (
                    <a href={`mailto:${s.email}`} className="gold">{s.email}</a>
                  )}
                </div>
              </div>

              <div className="infocard">
                <p className="eyebrow no-rule">Opening hours</p>
                <div className="hours" style={{ marginTop: ".4rem" }}>
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

        <section className="section">
          <div className="wrap">
            <div className="head-row">
              <div>
                <p className="eyebrow">The space</p>
                <h2>What it looks like<br />when you get here.</h2>
              </div>
            </div>
            <div className="strip">
              {SPACE_SHOTS.map((shot) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={shot.src}
                  src={shot.src}
                  alt={shot.alt}
                  width={600}
                  height={900}
                  loading="lazy"
                />
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer s={s} />
    </>
  );
}
