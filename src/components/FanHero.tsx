"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

/**
 * Editorial hero: the copy on the left, a fan of cards on the right that blooms
 * open on arrival and leans with the pointer.
 *
 * The hero video is not discarded for this — it is the front card. The four
 * photographs fan out behind it. A stack of stock-looking rectangles would have
 * been the easy version; using the room the cafe actually occupies is the whole
 * point of an editorial layout.
 *
 * The bloom is a CSS animation with `both` fill, not script. Same reasoning as
 * the menu curtain: a JS-driven reveal that fails to load leaves the hero
 * collapsed into a single stacked pile, and the hero is the one thing on the
 * site that must never depend on a bundle arriving. Under
 * `prefers-reduced-motion` the global rule collapses the duration to 1ms and
 * the cards simply appear in their final places.
 *
 * Script adds only the two things that cannot be declared: parallax, and the
 * magnetic pull on the primary button.
 *
 * Parallax lives on a nested element inside each card, never on the card
 * itself. The card owns its resting transform — the fan position the animation
 * lands on — and transforms do not compose across a single property. Writing
 * both to one element means whichever runs last wins and the fan collapses.
 */

type Card = {
  src: string;
  alt: string;
  /** Resting position, as a share of the stage. */
  x: string;
  y: string;
  rotate: string;
  /** How far it lags the pointer. Nearer cards move more. */
  depth: number;
  /** Order in the bloom. */
  delay: string;
  width: string;
  video?: boolean;
  poster?: string;
};

export default function FanHero({
  videoUrl,
  posterUrl,
  cafeName,
  tamilName,
  tagline,
  line1,
  line2,
  badge,
  trust,
  side,
}: {
  videoUrl: string;
  posterUrl: string;
  cafeName: string;
  tamilName: string;
  tagline: string;
  line1: string;
  line2: string;
  badge: string;
  trust: string;
  side: string;
}) {
  const root = useRef<HTMLElement>(null);
  const magnet = useRef<HTMLAnchorElement>(null);

  const [first, ...rest] = cafeName.split(" ");

  /* Back of the fan first, so the DOM order is also the paint order and the
     front card needs no z-index to sit on top. The two outermost cards lean
     hardest and sit highest — a fan whose outer leaves are the most upright
     reads as a tidy stack rather than something opening. */
  const cards: Card[] = [
    { src: "/space/shopfront.webp", alt: "The shopfront on OMR", x: "-42%", y: "-9%", rotate: "-13deg", depth: 0.22, delay: "0s", width: "50%" },
    { src: "/space/bakery.webp", alt: "The bake counter", x: "40%", y: "-12%", rotate: "12deg", depth: 0.28, delay: ".07s", width: "50%" },
    { src: "/space/seating.webp", alt: "Seating inside", x: "-24%", y: "7%", rotate: "-6deg", depth: 0.46, delay: ".14s", width: "56%" },
    { src: "/space/counter.webp", alt: "The counter", x: "23%", y: "5%", rotate: "6deg", depth: 0.52, delay: ".21s", width: "56%" },
    { src: videoUrl, alt: `${cafeName} — hero video`, x: "0%", y: "0%", rotate: "-1.5deg", depth: 0.8, delay: ".3s", width: "66%", video: true, poster: posterUrl },
  ];

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Coarse pointers have no hover to follow, and reading a touch as a
    // pointermove leaves the fan shoved to wherever the last tap landed.
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let raf = 0;
    let tx = 0, ty = 0;   // target
    let cx = 0, cy = 0;   // current

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      ty = ((e.clientY - r.top) / r.height) * 2 - 1;

      const btn = magnet.current;
      if (btn) {
        const b = btn.getBoundingClientRect();
        const dx = e.clientX - (b.left + b.width / 2);
        const dy = e.clientY - (b.top + b.height / 2);
        const dist = Math.hypot(dx, dy);
        // Pulls only within reach, and never further than a third of the way —
        // a button that chases the cursor across the page is a toy, one that
        // leans toward a hand already near it feels responsive.
        const reach = 130;
        const pull = dist < reach ? (1 - dist / reach) * 0.34 : 0;
        btn.style.setProperty("--mx", `${(dx * pull).toFixed(2)}px`);
        btn.style.setProperty("--my", `${(dy * pull).toFixed(2)}px`);
      }
    };

    const onLeave = () => {
      tx = 0;
      ty = 0;
      const btn = magnet.current;
      if (btn) {
        btn.style.setProperty("--mx", "0px");
        btn.style.setProperty("--my", "0px");
      }
    };

    const tick = () => {
      // Eased toward the target rather than set from it. Following the pointer
      // exactly makes the cards twitch on every jitter of the hand.
      cx += (tx - cx) * 0.075;
      cy += (ty - cy) * 0.075;
      el.style.setProperty("--px", `${(cx * 26).toFixed(2)}px`);
      el.style.setProperty("--py", `${(cy * 18).toFixed(2)}px`);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <section className="fanhero" ref={root}>
      <div className="wrap fanhero__grid">
        <div className="fanhero__copy">
          <p className="fanhero__eyebrow">
            <span className="open">
              <i className="pulse" />
              {badge}
            </span>
          </p>

          <h1 className="fanhero__title">
            <span className="fanhero__name">
              {first}
              <br />
              {rest.join(" ")}
            </span>
            <span className="ta tamil">{tamilName}</span>
          </h1>

          <p className="fanhero__tagline">{tagline}</p>

          <p className="fanhero__sub">
            {line1}
            <br />
            {line2}
          </p>

          <div className="fanhero__row">
            <Link className="btn btn--magnet" href="/menu" ref={magnet}>
              See the menu
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h13M13 6l6 6-6 6" />
              </svg>
            </Link>
            <Link className="btn btn--ghost" href="/visit">
              Find us on OMR
            </Link>
          </div>

          <p className="fanhero__trust">
            <span className="dots" aria-hidden="true">
              <i>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="m12 17.3-6.2 3.7 1.6-7L2 9.2l7.1-.6L12 2l2.9 6.6 7.1.6-5.4 4.8 1.6 7z" />
                </svg>
              </i>
            </span>
            {trust}
          </p>
        </div>

        <div className="fanhero__stage" aria-hidden="true">
          {cards.map((c, i) => (
            <div
              className="fanhero__card"
              key={i}
              style={
                {
                  "--x": c.x,
                  "--y": c.y,
                  "--r": c.rotate,
                  "--delay": c.delay,
                  "--w": c.width,
                } as React.CSSProperties
              }
            >
              <div
                className="fanhero__inner"
                style={{ "--depth": c.depth } as React.CSSProperties}
              >
                {c.video && c.src ? (
                  <video autoPlay muted loop playsInline preload="metadata" poster={c.poster}>
                    <source src={c.src} />
                  </video>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.video ? c.poster || "" : c.src} alt={c.alt} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="fanhero__side" aria-hidden="true">{side}</p>

      <div className="fanhero__cue" aria-hidden="true">
        <span className="bar" />
        Scroll
      </div>
    </section>
  );
}
