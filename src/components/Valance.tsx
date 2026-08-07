"use client";

import { useEffect, useRef } from "react";

/**
 * The curtain across a page header: a rod with finials, deep swagged cloth, and
 * drapes falling down both corners under a gold cord.
 *
 * Follows the reference the owner picked — a pole with ball ends, few deep
 * swags rather than many shallow scallops, a sash crossing the corner, two
 * tassels at different heights.
 *
 * Progressive enhancement, in that order:
 *   1. The markup is server-rendered, so the curtain is there before any script.
 *   2. CSS alone gives it its resting pose — with JS off it simply hangs.
 *   3. This component only adds the motion.
 *
 * What makes cloth read as cloth here is folds, not outline. The swag is not a
 * filled shape with lines drawn on it; it is built from ~10 tapering strips per
 * swag, each shaded on its own, so light runs along the crests and collects in
 * the valleys. Every strip reuses the same two gradients — SVG gradients in
 * objectBoundingBox units remap to each element's own box, so 30 folds cost two
 * gradient definitions rather than thirty.
 *
 * The motion is a spring integrator rather than a CSS transition, because cloth
 * does not ease — it overshoots and settles. Constants are React Spring's
 * `wobbly` preset (tension 180, friction 12). Written out rather than pulling in
 * the library: ~30 lines against ~30 KB, for one decorative header.
 *
 * Secondary motion is the point. The tassels run on a second, looser spring
 * that trails the drape, so they swing a beat behind it. That lag is what reads
 * as weight.
 */

/** React Spring's `wobbly`. */
const TENSION = 180;
const FRICTION = 12;

type Spring = { x: number; v: number };

const step = (s: Spring, target: number, dt: number) => {
  const a = -TENSION * (s.x - target) - FRICTION * s.v;
  s.v += a * dt;
  s.x += s.v * dt;
};

/* ------------------------------------------------------------- geometry -- */

/* The swag skeleton. Gathers every 400 units across a 1200-wide viewBox: three
   deep swags rather than five shallow scallops, matching the reference. The
   control points sit below the viewBox floor on purpose — the curve is clipped,
   which is what gives the dip its weight instead of a tidy arc. */
const GATHERS = [0, 400, 800, 1200];
const HANG = 58; // y where the cloth meets each gather
const DIP = 208; // control-point depth
const INSET = 80; // how far the control points sit inside the swag
const FOLDS = 10; // strips per swag

type P = readonly [number, number];

const cubic = (p0: P, p1: P, p2: P, p3: P, t: number): P => {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [
    a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
    a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
  ];
};

const n = (v: number) => Math.round(v * 100) / 100;

/**
 * One fold strip: down the cloth from the rod, along a slice of the swag's
 * bottom curve, and back up.
 *
 * The side edges bow outward slightly and the strip's top is narrower than its
 * bottom, which is what stops the swag looking like a fan of flat triangles —
 * real gathered fabric is pinched where it is fixed and open where it hangs.
 */
function fold(xa: number, xb: number, i: number) {
  const p0: P = [xa, HANG];
  const p1: P = [xa + INSET, DIP];
  const p2: P = [xb - INSET, DIP];
  const p3: P = [xb, HANG];

  const t0 = i / FOLDS;
  const t1 = (i + 1) / FOLDS;
  const b0 = cubic(p0, p1, p2, p3, t0);
  const b1 = cubic(p0, p1, p2, p3, t1);

  // Pinch the top of each strip toward the middle of its own span, so the
  // cloth gathers at the rod rather than meeting it as a flat band.
  const PINCH = 0.22;
  const topA = xa + (xb - xa) * (t0 + (t1 - t0) * PINCH);
  const topB = xa + (xb - xa) * (t1 - (t1 - t0) * PINCH);

  const bowA = b0[1] * 0.52;
  const bowB = b1[1] * 0.52;

  return (
    `M${n(topA)},0` +
    ` C${n(topA)},${n(bowA * 0.55)} ${n(b0[0])},${n(bowA)} ${n(b0[0])},${n(b0[1])}` +
    ` L${n(b1[0])},${n(b1[1])}` +
    ` C${n(b1[0])},${n(bowB)} ${n(topB)},${n(bowB * 0.55)} ${n(topB)},0 Z`
  );
}

/** Every strip across every swag, tagged so the shading can alternate. */
const STRIPS = GATHERS.slice(0, -1).flatMap((xa, s) =>
  Array.from({ length: FOLDS }, (_, i) => ({
    key: `${s}-${i}`,
    d: fold(xa, GATHERS[s + 1], i),
    // Crests catch the light, valleys swallow it. Offsetting by the swag index
    // keeps neighbouring swags from lining up into a stripe.
    lit: (i + s) % 2 === 0,
  })),
);

/* ---------------------------------------------------------------- parts -- */

/** One corner: sash across the fabric, cord, and a tassel at each of two drops. */
function Corner({ side }: { side: "l" | "r" }) {
  return (
    <span className={`drape drape--${side}`}>
      <span className="drape__sheen" />
      <span className="drape__sash" />
      <span className="drape__cord" />
      <span className="drape__tassel drape__tassel--hi">
        <span className="tsl__cap" />
        <span className="tsl__skirt" />
      </span>
      <span className="drape__tassel drape__tassel--lo">
        <span className="tsl__cap" />
        <span className="tsl__skirt" />
      </span>
      {/* Where the cloth meets the rule that closes the header — it gathers and
          shadows there, the way a floor-length curtain pools. An earlier
          version curled the hem instead; on a strip this narrow any bulge read
          as a blunt object rather than fabric. */}
      <span className="drape__hem" />
    </span>
  );
}

export default function Valance() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    const head = el?.closest(".pagehead") as HTMLElement | null;
    if (!el || !head) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let aim = 0;
    let pointing = false;
    const cloth: Spring = { x: 0, v: 0 };
    const swing: Spring = { x: 0, v: 0 };
    let raf = 0;
    let last = performance.now();

    const onMove = (e: PointerEvent) => {
      const r = head.getBoundingClientRect();
      aim = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointing = true;
    };
    const onLeave = () => {
      aim = 0;
      pointing = false;
    };

    const tick = (now: number) => {
      // Clamped so a background tab returning does not fire one huge step and
      // fling the springs.
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;

      /* Air, not idleness. Two sines well off a common multiple never line back
         up, so the drift has no loop to notice — which is the whole difference
         between hanging cloth and a picture of hanging cloth. It fades down
         while the pointer is driving, so deliberate movement always wins. */
      const drift =
        (Math.sin(now / 2600) * 0.16 + Math.sin(now / 1730) * 0.07) *
        (pointing ? 0.25 : 1);

      step(cloth, aim + drift, dt);
      step(swing, cloth.x, dt); // tassels chase the cloth, not the pointer

      el.style.setProperty("--sway", cloth.x.toFixed(4));
      el.style.setProperty("--swing", (swing.x - cloth.x).toFixed(4));
      // The swag lifts a little as it swings either way — cloth shortens when
      // it moves, it does not slide sideways as a rigid sheet.
      el.style.setProperty("--lift", Math.abs(cloth.x).toFixed(4));

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    head.addEventListener("pointermove", onMove, { passive: true });
    head.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      head.removeEventListener("pointermove", onMove);
      head.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div className="valance" ref={root} aria-hidden="true">
      {/* The pole the whole thing hangs from. */}
      <span className="valance__rod" />

      <svg
        className="valance__cloth"
        viewBox="0 0 1200 200"
        preserveAspectRatio="none"
        focusable="false"
      >
        <defs>
          {/* Both in objectBoundingBox units — the default — so every strip
              gets the gradient mapped to its own box rather than to the whole
              curtain. That is what makes one definition shade thirty folds. */}
          <linearGradient id="foldLit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8a613b" />
            <stop offset="30%" stopColor="#6b4a2c" />
            <stop offset="72%" stopColor="#3a2718" />
            <stop offset="100%" stopColor="#1b120b" />
          </linearGradient>
          <linearGradient id="foldDark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4e3520" />
            <stop offset="34%" stopColor="#33220f" />
            <stop offset="76%" stopColor="#1d1309" />
            <stop offset="100%" stopColor="#0d0805" />
          </linearGradient>

          {/* The layer behind the swags, showing through the gaps. */}
          <linearGradient id="valBack" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#31200f" />
            <stop offset="100%" stopColor="#0a0604" />
          </linearGradient>

          {/* Contact shadow under the rod: cloth is darkest where it is
              gathered and nothing reaches it. */}
          <linearGradient id="valOcclusion" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#000" stopOpacity=".62" />
            <stop offset="55%" stopColor="#000" stopOpacity=".12" />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </linearGradient>

          {/* Velvet nap. High frequency across, almost none down, which gives
              vertical thread streaks rather than television static. */}
          <filter id="valWeave" x="0" y="0" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.85 0.015"
              numOctaves="2"
              seed="11"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>

          <clipPath id="valClip">
            <path
              d="M0,0 H1200 V58
                 C1120,208 880,208 800,58
                 C720,208 480,208 400,58
                 C320,208 80,208 0,58 Z"
            />
          </clipPath>
        </defs>

        {/* Second layer, hung lower and darker, seen through the gaps between
            swags. Without it the swags read as cut-outs over the page. */}
        <path
          fill="url(#valBack)"
          d="M0,0 H1200 V78
             C1000,232 800,232 600,78
             C400,232 200,232 0,78 Z"
        />

        <g className="valance__folds">
          {STRIPS.map((s) => (
            <path key={s.key} d={s.d} fill={`url(#${s.lit ? "foldLit" : "foldDark"})`} />
          ))}
        </g>

        {/* Texture and contact shadow, both held inside the swag outline. */}
        <g clipPath="url(#valClip)">
          <rect
            className="valance__weave"
            x="0"
            y="0"
            width="1200"
            height="200"
            filter="url(#valWeave)"
          />
          <rect x="0" y="0" width="1200" height="200" fill="url(#valOcclusion)" />
        </g>

        <path
          className="valance__trim"
          fill="none"
          d="M1200,58
             C1120,208 880,208 800,58
             C720,208 480,208 400,58
             C320,208 80,208 0,58"
        />
      </svg>

      <Corner side="l" />
      <Corner side="r" />
    </div>
  );
}
