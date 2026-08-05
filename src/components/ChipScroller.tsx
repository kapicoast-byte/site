"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Horizontal rail for the menu category chips.
 *
 * `overflow-x: auto` alone is only half an answer: on a touchscreen it works,
 * but with a mouse there is no scrollbar (we hide it), a vertical wheel does
 * nothing to a horizontal box, and nothing on screen says there is more to the
 * right. So this adds the two affordances that were missing — arrow buttons
 * and click-drag — plus a fade at whichever edge still has chips beyond it.
 *
 * Deliberately no vertical-wheel hijack. The toolbar is sticky at the top of
 * the menu page, so the pointer rests over it while reading; turning wheel-down
 * into scroll-right there would keep stopping the page from scrolling. Shift +
 * wheel already scrolls it horizontally, for free, in every browser.
 */
export default function ChipScroller({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const measure = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setOverflows(max > 1);
    // 1px of slack: scrollLeft is fractional on zoomed or hi-dpi displays and
    // never lands exactly on max.
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft >= max - 1);
  }, []);

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    measure();

    // Watch the rail and its chips: fonts load late and the widths change.
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    return () => ro.disconnect();
  }, [measure, children]);

  const nudge = (dir: 1 | -1) => {
    const el = rail.current;
    if (!el) return;
    // Just under a full width, so a chip stays visible as an anchor.
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  /* Click-drag. Mouse only — touch already scrolls natively, and capturing the
     pointer would take that away. `moved` tells the click handler below whether
     this was a drag or a real click on a chip. */
  const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: false });

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const el = rail.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    drag.current = {
      active: true,
      startX: e.clientX,
      startLeft: el.scrollLeft,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = rail.current;
    if (!d.active || !el) return;
    const dx = e.clientX - d.startX;
    // Only claim the gesture past a few pixels, so a slightly shaky click on a
    // chip still counts as a click.
    if (!d.moved && Math.abs(dx) < 4) return;
    if (!d.moved) {
      d.moved = true;
      el.setPointerCapture(e.pointerId);
      // The rail scrolls smoothly for the arrow buttons; under a drag that
      // animation lags a frame or two behind the pointer and feels broken.
      el.style.scrollBehavior = "auto";
    }
    el.scrollLeft = d.startLeft - dx;
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = rail.current;
    if (el?.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    if (el) el.style.scrollBehavior = "";
    drag.current.active = false;
    // Cleared after the click event has had its chance to fire.
    setTimeout(() => (drag.current.moved = false), 0);
  };

  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div
      className={[
        "chiprail",
        overflows ? "is-scrollable" : "",
        atStart ? "at-start" : "",
        atEnd ? "at-end" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className="chiprail__arw chiprail__arw--l"
        aria-label="Scroll categories left"
        // Hidden from everyone, not just visually: with the rail keyboard
        // reachable, these are a mouse convenience and nothing more.
        hidden={!overflows || atStart}
        tabIndex={-1}
        onClick={() => nudge(-1)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m15 5-7 7 7 7" />
        </svg>
      </button>

      <div
        ref={rail}
        className="chips"
        role="tablist"
        aria-label={label}
        onScroll={measure}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
      >
        {children}
      </div>

      <button
        type="button"
        className="chiprail__arw chiprail__arw--r"
        aria-label="Scroll categories right"
        hidden={!overflows || atEnd}
        tabIndex={-1}
        onClick={() => nudge(1)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m9 5 7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
