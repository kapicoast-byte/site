"use client";

import { useEffect, useRef } from "react";

/**
 * The cake on the home page — real 3D geometry, not a photograph.
 *
 * Each tier is a cylinder assembled from flat panels rotated around the Y axis
 * inside a `preserve-3d` context, so the silhouette is genuinely round and the
 * frosting drips wrap the side the way they would on a real cake. Nothing is
 * downloaded: no image, no model, no library. It costs about 6 KB of markup and
 * paints instantly, which a photograph of a cake would not.
 *
 * It follows the pointer, can be dragged to spin, and drifts slowly on its own
 * when left alone. Under prefers-reduced-motion it holds a fixed angle and the
 * animation loop never starts.
 */

/* Geometry, in the scene's own units. Scaled to fit by CSS. */
const BOARD = { r: 156, h: 14 };
const TIERS = [
  { r: 140, h: 74, seg: 34, cls: "t1" },
  { r: 104, h: 62, seg: 30, cls: "t2" },
  { r: 68, h: 52, seg: 26, cls: "t3" },
];
const CANDLES = 5;

/**
 * Round before these numbers reach the DOM.
 *
 * Math.sin, cos and tan are not required to agree to the last bit between
 * implementations, and Node and the browser really do differ: the server
 * rendered a drip of 16.743933301198904px and the client computed
 * ...908px, which React reports as a hydration mismatch. Three decimals is far
 * finer than a pixel and identical on both sides.
 */
const n = (v: number, dp = 3) => Number(v.toFixed(dp));

/** Panel width for a cylinder of N segments — circumscribed, so edges meet. */
const panelWidth = (r: number, seg: number) => n(2 * r * Math.tan(Math.PI / seg) + 1.2);

/** Deterministic wobble so the drips look hand-piped instead of stamped. */
const dripFor = (i: number) => n(9 + 15 * Math.abs(Math.sin(i * 2.7)));

function Tier({
  r,
  h,
  seg,
  cls,
  top,
}: {
  r: number;
  h: number;
  seg: number;
  cls: string;
  top: number;
}) {
  const w = panelWidth(r, seg);
  return (
    <div className={`cake3d__tier cake3d__tier--${cls}`} style={{ top: `${top}px` }}>
      {Array.from({ length: seg }, (_, i) => (
        <span
          key={i}
          className="cake3d__panel"
          style={
            {
              "--a": `${n((360 / seg) * i)}deg`,
              "--r": `${r}px`,
              "--w": `${w}px`,
              "--h": `${h}px`,
              "--drip": `${dripFor(i)}px`,
              // Static shading baked per panel: the front faces read lighter
              // than the ones turning away, which is what gives it volume.
              "--shade": `${n(0.55 + 0.45 * Math.cos((2 * Math.PI * i) / seg))}`,
            } as React.CSSProperties
          }
        />
      ))}
      <span className="cake3d__top" style={{ "--r": `${r}px` } as React.CSSProperties} />
    </div>
  );
}

export default function CakeShowpiece() {
  const scene = useRef<HTMLDivElement>(null);
  const cake = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cake.current;
    const box = scene.current;
    if (!el || !box) return;

    const still = matchMedia("(prefers-reduced-motion: reduce)");
    if (still.matches) {
      // A fixed three-quarter angle. No loop, nothing moving.
      el.style.setProperty("--ry", "-24deg");
      el.style.setProperty("--rx", "9deg");
      return;
    }

    let targetY = -24;
    let targetX = 9;
    let curY = -24;
    let curX = 9;
    let drift = 0;
    let idle = 0;
    let raf = 0;

    const drag = { on: false, x: 0, startY: 0 };

    const onEnter = () => (idle = 0);
    const onMove = (e: PointerEvent) => {
      const r = box.getBoundingClientRect();
      if (drag.on) {
        targetY = drag.startY + (e.clientX - drag.x) * 0.55;
        idle = 0;
        return;
      }
      // Pointer position maps to a gentle look-around, not a full spin.
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      targetY = -24 + nx * 54;
      targetX = 9 - ny * 20;
      idle = 0;
    };
    const onLeave = () => {
      targetY = -24;
      targetX = 9;
    };
    const onDown = (e: PointerEvent) => {
      drag.on = true;
      drag.x = e.clientX;
      drag.startY = curY;
      // Capture is a nicety — it keeps the drag alive past the edge of the
      // scene. If the browser refuses it, the drag should still work.
      try {
        box.setPointerCapture(e.pointerId);
      } catch {
        /* no capture available; pointermove on the element still fires */
      }
      box.classList.add("is-grabbing");
    };
    const onUp = (e: PointerEvent) => {
      drag.on = false;
      try {
        if (box.hasPointerCapture(e.pointerId)) box.releasePointerCapture(e.pointerId);
      } catch {
        /* nothing to release */
      }
      box.classList.remove("is-grabbing");
    };

    const tick = () => {
      // Left alone for a moment, it starts turning by itself.
      idle += 1;
      if (idle > 90 && !drag.on) drift += 0.18;

      curY += (targetY + drift - curY) * 0.075;
      curX += (targetX - curX) * 0.075;
      el.style.setProperty("--ry", `${curY.toFixed(2)}deg`);
      el.style.setProperty("--rx", `${curX.toFixed(2)}deg`);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    box.addEventListener("pointerenter", onEnter);
    box.addEventListener("pointermove", onMove);
    box.addEventListener("pointerleave", onLeave);
    box.addEventListener("pointerdown", onDown);
    box.addEventListener("pointerup", onUp);
    box.addEventListener("pointercancel", onUp);

    return () => {
      cancelAnimationFrame(raf);
      box.removeEventListener("pointerenter", onEnter);
      box.removeEventListener("pointermove", onMove);
      box.removeEventListener("pointerleave", onLeave);
      box.removeEventListener("pointerdown", onDown);
      box.removeEventListener("pointerup", onUp);
      box.removeEventListener("pointercancel", onUp);
    };
  }, []);

  /* Tier tops, in screen coordinates where y grows downward. The smallest tier
     is on top at y=0 and the widest sits lowest, so the biggest `top` belongs
     to the first (largest) entry in TIERS. */
  const [big, mid, small] = TIERS;
  const topSmall = 0;
  const topMid = small.h;
  const topBig = small.h + mid.h;
  const boardTop = small.h + mid.h + big.h;
  const tops = [topBig, topMid, topSmall];

  return (
    <div
      className="cake3d"
      ref={scene}
      // Decorative. The section's heading and buttons carry the meaning.
      role="img"
      aria-label="A three-tier celebration cake"
    >
      {/* The sizer carries the scaled-down dimensions so the layout reserves
          what is actually drawn; the stage keeps its full-size coordinate
          space inside, scaled from its top-left corner. */}
      <div className="cake3d__sizer">
      <div className="cake3d__stage">
        <div className="cake3d__cake" ref={cake}>
          <span
            className="cake3d__board"
            style={{ "--r": `${BOARD.r}px`, top: `${boardTop}px` } as React.CSSProperties}
          />

          {TIERS.map((t, i) => (
            <Tier key={t.cls} r={t.r} h={t.h} seg={t.seg} cls={t.cls} top={tops[i]} />
          ))}

          {/* Candles sit on the top tier and billboard to face the viewer. */}
          <div className="cake3d__candles" style={{ top: `${topSmall}px` }}>
            {Array.from({ length: CANDLES }, (_, i) => {
              const a = n((360 / CANDLES) * i);
              return (
                <span
                  key={i}
                  className="cake3d__candle"
                  style={
                    { "--a": `${a}deg`, "--delay": `${i * 0.37}s` } as React.CSSProperties
                  }
                >
                  <span className="cake3d__wick" />
                  <span className="cake3d__flame" />
                </span>
              );
            })}
          </div>
        </div>

        {/* Fixed light, in front of the rotating geometry rather than part of
            it, so the cake keeps a consistent lit side as it turns. */}
        <span className="cake3d__light" aria-hidden="true" />
        <span className="cake3d__floor" aria-hidden="true" />
      </div>
      </div>

      <p className="cake3d__hint">Drag to turn it</p>
    </div>
  );
}
