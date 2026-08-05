import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSettings, waLink } from "@/lib/settings";
import Nav from "@/components/Nav";
import Valance from "@/components/Valance";
import Footer from "@/components/Footer";
import Marquee from "@/components/Marquee";
import CakeBuilder, { type Option } from "@/components/CakeBuilder";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order Cakes for Parties & Events — Kapi Coast",
  description:
    "Build your celebration cake at Kapi Coast, OMR Kazhipattur. Live pricing, plus high tea and office event packages along OMR.",
};

type Row = Option & { kind: string };
const pick = (rows: Row[], kind: string) => rows.filter((r) => r.kind === kind);

export default async function CakesPage() {
  const [s, options, packages] = await Promise.all([
    getSettings(),
    db.cakeOption.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
    db.package.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
  ]);

  const rows = options as unknown as Row[];

  return (
    <>
      <Nav logoUrl={s.logoDarkUrl} tamilName={s.tamilName} />

      <main id="main">
        <section className="pagehead">
          <Valance />
          <div className="pagehead__ghost tamil" aria-hidden="true">கேக்</div>
          <div className="wrap">
            <p className="eyebrow">Parties · Birthdays · Offices</p>
            <h1 style={{ fontSize: "clamp(2.7rem,7.5vw,5.6rem)", marginTop: ".6rem" }}>
              Order cakes for<br /><span className="gold">your people.</span>
            </h1>
            <p className="lede" style={{ marginTop: "1.4rem" }}>
              Built to your size, your flavour and your Chennai weather.
            </p>
          </div>
        </section>

        <section className="section section--tight" id="builder">
          <div className="wrap">
            <div className="head-row">
              <div>
                <p className="eyebrow">Step by step</p>
                <h2>Build it, see<br />the price move.</h2>
              </div>
              <p className="lede" style={{ maxWidth: "34ch" }}>
                Birthdays and celebrations, baked to your design. Order a day ahead.
              </p>
            </div>

            {rows.length > 0 ? (
              <CakeBuilder
                flavours={pick(rows, "flavour")}
                sizes={pick(rows, "size")}
                finishes={pick(rows, "finish")}
                occasions={pick(rows, "occasion")}
                addons={pick(rows, "addon")}
                whatsapp={s.whatsapp}
                phone={s.phone}
                email={s.email}
              />
            ) : (
              /* No options configured yet — send people to the counter rather
                 than show an empty form. Add options in /admin/cakes. */
              <div className="note">
                <b>Cakes are made to order</b>
                Tell us the occasion, the size and the flavour and we&apos;ll bake it
                to your design. Please order at least a day ahead.
                <span style={{ display: "flex", gap: ".6rem", flexWrap: "wrap", marginTop: "1rem" }}>
                  <a className="btn" href={`tel:${s.phone.replace(/\s/g, "")}`}>
                    Call {s.phone}
                  </a>
                  <a
                    className="btn btn--ghost"
                    href={waLink(s, `Hi ${s.cafeName} — I'd like to order a cake.`)}
                    target="_blank"
                    rel="noopener"
                  >
                    Message on WhatsApp
                  </a>
                </span>
              </div>
            )}
          </div>
        </section>

        <Marquee items={["Eggless at no extra charge", "Delivery across OMR", "48 hour notice"]} />

        {packages.length > 0 && (
          <section className="section" id="packages">
            <div className="wrap">
              <div className="head-row">
                <div>
                  <p className="eyebrow">Bigger than a cake</p>
                  <h2>Event packages.</h2>
                </div>
              </div>
              <div className="grid grid--3">
                {packages.map((p) => (
                  <div className={`pkg${p.hero ? " pkg--hero" : ""}`} key={p.id}>
                    {p.hero && <span className="ribbon">Most booked</span>}
                    <h3>{p.name}</h3>
                    <div className="pkg__price">
                      {p.price}
                      <small>{p.unit}</small>
                    </div>
                    <ul>
                      {p.items.map((i, n) => (
                        <li key={n}>{i}</li>
                      ))}
                    </ul>
                    <a
                      className={`btn ${p.hero ? "btn--red" : "btn--ghost"}`}
                      href={waLink(s, `Hi ${s.cafeName} — I'd like to enquire about the "${p.name}" package.`)}
                      target="_blank"
                      rel="noopener"
                    >
                      Enquire
                    </a>
                  </div>
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
