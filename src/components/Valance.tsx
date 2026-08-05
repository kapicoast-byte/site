"use client";

import { useEffect, useRef } from "react";

/**
 * The curtain across a page header: a rod with finials, deep swagged cloth, and
 * drapes falling down both corners under a gold cord.
 *
 * Follows the reference the owner picked — a pole with ball ends, few deep
 * swags rather than many shallow scallops, a sash crossing the corner, two
 * tassels at different heights, and the fabric curling at the bottom to show
 * its lighter reverse.
 *
 * Progressive enhancement, in that order:
 *   1. The markup is server-rendered, so the curtain is there before any script.
 *   2. CSS alone gives it its resting pose — with JS off it simply hangs.
 *   3. This component only adds the sway.
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
  const a = (-TENSION * (s.x - target) - FRICTION * s.v) / 1;
  s.v += a * dt;
  s.x += s.v * dt;
};

/** One corner: sash across the fabric, cord, and a tassel at each of two drops. */
function Corner({ side }: { side: "l" | "r" }) {
  return (
    <span className={`drape drape--${side}`}>
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
    const cloth: Spring = { x: 0, v: 0 };
    const swing: Spring = { x: 0, v: 0 };
    let raf = 0;
    let last = performance.now();

    const onMove = (e: PointerEvent) => {
      const r = head.getBoundingClientRect();
      aim = ((e.clientX - r.left) / r.width) * 2 - 1;
    };
    const onLeave = () => (aim = 0);

    const tick = (now: number) => {
      // Clamped so a background tab returning does not fire one huge step and
      // fling the springs.
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      step(cloth, aim, dt);
      step(swing, cloth.x, dt);   // tassels chase the cloth, not the pointer
      el.style.setProperty("--sway", cloth.x.toFixed(4));
      el.style.setProperty("--swing", (swing.x - cloth.x).toFixed(4));
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
          <linearGradient id="valFront" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6b4a2c" />
            <stop offset="42%" stopColor="#432d1b" />
            <stop offset="100%" stopColor="#1d140d" />
          </linearGradient>
          <linearGradient id="valBack" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a2712" />
            <stop offset="100%" stopColor="#120c07" />
          </linearGradient>
        </defs>

        {/* Three deep swags, not five shallow scallops — the reference hangs in
            long generous curves. */}
        <path
          fill="url(#valBack)"
          d="M0,0 H1200 V78
             C1000,232 800,232 600,78
             C400,232 200,232 0,78 Z"
        />
        <path
          fill="url(#valFront)"
          d="M0,0 H1200 V58
             C1120,208 880,208 800,58
             C720,208 480,208 400,58
             C320,208 80,208 0,58 Z"
        />
        <path
          className="valance__trim"
          fill="none"
          d="M1200,58
             C1120,208 880,208 800,58
             C720,208 480,208 400,58
             C320,208 80,208 0,58"
        />
        <g className="valance__folds">
          {[0, 400, 800, 1200].map((x) => (
            <g key={x}>
              <path d={`M${x},0 C${x - 34},46 ${x - 44},78 ${x - 38},124`} />
              <path d={`M${x},0 C${x + 34},46 ${x + 44},78 ${x + 38},124`} />
              <path d={`M${x},0 L${x},134`} />
            </g>
          ))}
        </g>
      </svg>

      <Corner side="l" />
      <Corner side="r" />
    </div>
  );
}
