"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ChipScroller from "./ChipScroller";

export type Ingredient = { amt: string; txt: string };
export type Dish = {
  id: string;
  slug: string;
  name: string;
  tamil: string;
  price: number;
  blurb: string;
  accent: string;
  imageUrl: string | null;
  tags: string[];
  time: string;
  serves: string;
  level: string;
  note: string;
  ingredients: Ingredient[];
  steps: string[];
  categorySlug: string;
  categoryLabel: string;
};

const TAG_LABEL: Record<string, string> = {
  veg: "Veg",
  hot: "Spice-forward",
  star: "Counter favourite",
};
const rupee = (n: number) => "₹" + n.toLocaleString("en-IN");

export default function MenuBrowser({
  dishes,
  categories,
}: {
  dishes: Dish[];
  categories: { slug: string; label: string }[];
}) {
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Dish | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const found = dishes.filter((d) => {
      if (cat !== "all" && d.categorySlug !== cat) return false;
      if (!needle) return true;
      const hay = [d.name, d.tamil, d.blurb, d.categoryLabel, ...d.ingredients.map((i) => i.txt)]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });

    /* Everything view: dishes with a photo come first. Seventy-six plain text
       rows is a wall to scroll past, and the ones we have shot are what make it
       worth looking at.

       Only here — inside a single category the list is short enough to take in
       at a glance, and the counter's own ordering (filter coffee before black
       coffee) matters more there than the pictures do.

       Sort is stable, so within "has a photo" and "has none" everything keeps
       its existing order. Once every dish has a photo this quietly does nothing. */
    if (cat !== "all") return found;
    return [...found].sort(
      (a, b) => Number(Boolean(b.imageUrl)) - Number(Boolean(a.imageUrl)),
    );
  }, [dishes, cat, q]);

  // Deep link: /menu#podi-idli opens that recipe.
  useEffect(() => {
    const slug = decodeURIComponent(location.hash.slice(1));
    if (slug) {
      const d = dishes.find((x) => x.slug === slug);
      if (d) setOpen(d);
    }
  }, [dishes]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    if (open) {
      setChecked(new Set());
      closeRef.current?.focus();
      history.replaceState(null, "", "#" + open.slug);
    } else {
      history.replaceState(null, "", location.pathname);
      lastFocus.current?.focus();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  const toggle = (i: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  return (
    <>
      <div className="toolbar">
        <div className="wrap toolbar__inner">
          <ChipScroller label="Menu categories">
            <button
              className={`chip${cat === "all" ? " is-on" : ""}`}
              type="button"
              role="tab"
              aria-selected={cat === "all"}
              onClick={() => setCat("all")}
            >
              Everything
            </button>
            {categories.map((c) => (
              <button
                key={c.slug}
                className={`chip${cat === c.slug ? " is-on" : ""}`}
                type="button"
                role="tab"
                aria-selected={cat === c.slug}
                onClick={() => setCat(c.slug)}
              >
                {c.label}
              </button>
            ))}
          </ChipScroller>

          <label className="search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              placeholder="Search dishes, ingredients…"
              aria-label="Search the menu"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
        </div>
      </div>

      <section className="section section--tight section--menu">
        <div className="wrap">
          <p
            className="mcount"
            style={{ fontSize: "var(--fs-caps)", letterSpacing: ".2em", textTransform: "uppercase", color: "var(--cream-dim)" }}
          >
            {list.length
              ? `${list.length} ${list.length === 1 ? "dish" : "dishes"}`
              : ""}
          </p>

          <div className="mgrid">
            {list.length === 0 && (
              <div className="empty">
                <p style={{ fontFamily: "var(--f-display)", fontSize: "1.6rem", color: "var(--cream)" }}>
                  Nothing by that name.
                </p>
                <p style={{ marginTop: ".5rem" }}>Try “kapi”, “podi”, “chaat” — or clear the search.</p>
              </div>
            )}

            {list.map((d) => (
              <button
                className="mitem"
                key={d.id}
                id={d.slug}
                type="button"
                onClick={(e) => {
                  lastFocus.current = e.currentTarget;
                  setOpen(d);
                }}
              >
                {d.imageUrl && (
                  <span className="mitem__thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={d.imageUrl} alt="" loading="lazy" />
                  </span>
                )}
                <span className="mitem__top">
                  <span className="mitem__name">{d.name}</span>
                  <span className="mitem__price">{rupee(d.price)}</span>
                </span>
                {d.tamil && <span className="mitem__ta tamil">{d.tamil}</span>}
                <span className="mitem__desc">{d.blurb}</span>
                <span className="mitem__foot">
                  {d.tags.map((t) => (
                    <span key={t} className={`pill pill--${t}`}>{TAG_LABEL[t] ?? t}</span>
                  ))}
                  <span className="mitem__cta">Recipe →</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- drawer ---- */}
      <div
        className={`drawer-scrim${open ? " is-open" : ""}`}
        hidden={!open}
        onClick={() => setOpen(null)}
      />
      <aside
        className={`drawer${open ? " is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={open ? `${open.name} recipe` : undefined}
        hidden={!open}
      >
        <div className="drawer__bar">
          <p className="eyebrow no-rule">The recipe</p>
          <button ref={closeRef} className="xbtn" type="button" aria-label="Close recipe" onClick={() => setOpen(null)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="drawer__scroll">
          {open && (
            <>
              <div className="drawer__hero poster" style={{ ["--a" as string]: open.accent }}>
                {open.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={open.imageUrl} alt={open.name} />
                ) : (
                  <>
                    <span className="poster__steam" />
                    <span className="poster__cat">{open.categoryLabel}</span>
                    <span className="poster__ta tamil">{open.tamil}</span>
                  </>
                )}
              </div>

              <div className="drawer__body">
                <h3>{open.name}</h3>
                {open.tamil && <p className="drawer__ta tamil">{open.tamil}</p>}
                <p className="drawer__desc">{open.blurb}</p>

                <div className="meta">
                  <div><b>{open.time || "—"}</b><span>Time</span></div>
                  <div><b>{open.serves || "—"}</b><span>Makes</span></div>
                  <div><b>{open.level || "—"}</b><span>Effort</span></div>
                </div>

                {open.ingredients.length > 0 && (
                  <div className="rsec">
                    <h4>What you need</h4>
                    <ul className="ing">
                      {open.ingredients.map((ing, i) => (
                        <li key={i}>
                          <label>
                            <input type="checkbox" checked={checked.has(i)} onChange={() => toggle(i)} />
                            <span className="box" aria-hidden="true" />
                            <span className="txt">
                              <b className="amt">{ing.amt}</b> — {ing.txt}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {open.steps.length > 0 && (
                  <div className="rsec">
                    <h4>Method</h4>
                    <ol className="steps">
                      {open.steps.map((st, i) => (
                        <li key={i}><span>{st}</span></li>
                      ))}
                    </ol>
                  </div>
                )}

                {open.note && (
                  <div className="rsec">
                    <div className="note">
                      <b>From the counter</b>
                      {open.note}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="drawer__foot">
          {open && (
            <span className="price">
              {rupee(open.price)}
              <small>At the counter</small>
            </span>
          )}
        </div>
      </aside>
    </>
  );
}
