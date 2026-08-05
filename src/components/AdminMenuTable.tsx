"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { deleteMenuItem } from "@/app/admin/actions";

export type AdminDish = {
  id: string;
  name: string;
  tamil: string;
  imageUrl: string | null;
  accent: string;
  price: number;
  published: boolean;
  category: string;
};

const rupee = (n: number) => "₹" + n.toLocaleString("en-IN");

/**
 * The dish list, with a search box.
 *
 * Filtering happens in the browser rather than through the server: 76 dishes is
 * nothing to hold in memory, and it means results appear as you type instead of
 * after a round-trip per keystroke.
 */
export default function AdminMenuTable({ items }: { items: AdminDish[] }) {
  const [q, setQ] = useState("");

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((m) =>
      // Name, Tamil name and category — the three things on screen, so a
      // result never looks like it matched for no reason.
      `${m.name} ${m.tamil} ${m.category}`.toLowerCase().includes(term),
    );
  }, [items, q]);

  return (
    <>
      <div className="adm-card" style={{ paddingBlock: "1rem" }}>
        <label className="adm-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            // Tamil names are matched too, but no dish has one yet, so
            // promising it here would advertise a search that finds nothing.
            placeholder="Search dishes by name or category…"
            aria-label="Search dishes"
          />
          {q && (
            <button type="button" className="adm-search__x" onClick={() => setQ("")} aria-label="Clear search">
              ×
            </button>
          )}
        </label>
        <p className="adm-search__count" aria-live="polite">
          {q
            ? `${shown.length} of ${items.length} ${items.length === 1 ? "dish" : "dishes"}`
            : `${items.length} ${items.length === 1 ? "dish" : "dishes"}`}
        </p>
      </div>

      <div className="adm-card">
        <div className="adm-wrapx">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Dish</th>
                <th>Category</th>
                <th className="num">Price</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map((m) => (
                <tr key={m.id}>
                  <td>
                    <Link href={`/admin/menu/${m.id}`} style={{ display: "flex", gap: ".6rem", alignItems: "center" }}>
                      {m.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.imageUrl} alt="" width={36} height={36}
                             style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 6, flex: "none" }} />
                      ) : (
                        <span style={{ width: 36, height: 36, borderRadius: 6, flex: "none",
                                       background: m.accent, opacity: .5 }} />
                      )}
                      <b>{m.name}</b>
                    </Link>
                    {m.tamil && (
                      <div className="tamil" style={{ fontSize: ".8rem", color: "var(--kumkum-lit)" }}>
                        {m.tamil}
                      </div>
                    )}
                  </td>
                  <td style={{ color: "var(--cream-dim)" }}>{m.category}</td>
                  <td className="num">{rupee(m.price)}</td>
                  <td>
                    <span className={`adm-tag ${m.published ? "adm-tag--on" : "adm-tag--off"}`}>
                      {m.published ? "Live" : "Hidden"}
                    </span>
                  </td>
                  <td className="num">
                    <form action={deleteMenuItem}>
                      <input type="hidden" name="id" value={m.id} />
                      <button className="adm-btn adm-btn--ghost" type="submit" style={{ padding: ".35rem .7rem", minHeight: 0, fontSize: ".72rem" }}>
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!shown.length && (
            <p className="adm-empty">
              Nothing matches “{q}”. Try part of the name, or a category like “tiffin”.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
