import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [s, dishes, drafts, posts, media, packages] = await Promise.all([
    getSettings(),
    db.menuItem.count({ where: { published: true } }),
    db.menuItem.count({ where: { published: false } }),
    db.post.count({ where: { published: true } }),
    db.media.count(),
    db.package.count({ where: { active: true } }),
  ]);

  const tiles = [
    { label: "Dishes live", value: dishes, href: "/admin/menu" },
    { label: "Dishes hidden", value: drafts, href: "/admin/menu" },
    { label: "Journal posts", value: posts, href: "/admin/journal" },
    { label: "Event packages", value: packages, href: "/admin/cakes" },
    { label: "Files uploaded", value: media, href: "/admin/media" },
  ];

  return (
    <>
      <div className="adm__head">
        <div>
          <h1>Dashboard</h1>
          <p>Everything on the public site is edited from here.</p>
        </div>
        <Link className="adm-btn" href="/admin/menu">Edit the menu</Link>
      </div>

      <div className="adm-card">
        <h2>At a glance</h2>
        <div className="adm-grid">
          {tiles.map((t) => (
            <Link
              key={t.label}
              href={t.href}
              style={{
                border: "1px solid var(--line)",
                borderRadius: 10,
                padding: "1rem",
                display: "block",
              }}
            >
              <b style={{ fontSize: "1.9rem", color: "var(--gold)", display: "block", lineHeight: 1 }}>
                {t.value}
              </b>
              <span style={{ fontSize: ".72rem", letterSpacing: ".14em", textTransform: "uppercase", color: "var(--cream-dim)" }}>
                {t.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="adm-card">
        <h2>Quick jobs</h2>
        <div className="adm-grid">
          <div>
            <p style={{ fontSize: ".9rem", marginBottom: ".6rem" }}>
              <b>Change a price</b>
              <br />
              <span style={{ color: "var(--cream-dim)" }}>Menu &amp; recipes → pick a dish → Price.</span>
            </p>
            <Link className="adm-btn adm-btn--ghost" href="/admin/menu">Open menu</Link>
          </div>
          <div>
            <p style={{ fontSize: ".9rem", marginBottom: ".6rem" }}>
              <b>Swap a photo or the hero video</b>
              <br />
              <span style={{ color: "var(--cream-dim)" }}>Upload it, copy the link, paste it into Site settings.</span>
            </p>
            <Link className="adm-btn adm-btn--ghost" href="/admin/media">Open media</Link>
          </div>
          <div>
            <p style={{ fontSize: ".9rem", marginBottom: ".6rem" }}>
              <b>Update hours or phone</b>
              <br />
              <span style={{ color: "var(--cream-dim)" }}>Site settings — changes every page at once.</span>
            </p>
            <Link className="adm-btn adm-btn--ghost" href="/admin/settings">Open settings</Link>
          </div>
        </div>
      </div>

      <div className="adm-card">
        <h2>Currently showing</h2>
        <p style={{ fontSize: ".9rem", color: "var(--cream-dim)" }}>
          <b style={{ color: "var(--cream)" }}>{s.cafeName}</b> · {s.phone} · {s.addressL1}
        </p>
      </div>
    </>
  );
}
