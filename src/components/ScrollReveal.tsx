"use client";

import { useEffect } from "react";

/**
 * Sections rise into place as they are scrolled to.
 *
 * Mounted once in the layout. It takes no children and renders nothing — it
 * finds the blocks itself, so no page or component had to be edited to opt in,
 * and nothing has to be remembered when a new page is added.
 *
 * The safety property matters more than the effect. The `data-reveal`
 * attribute — the thing the CSS hides — is written here, at runtime. It is
 * never in the served markup. If this bundle fails to load, or the browser has
 * no IntersectionObserver, the attribute is simply never added and every
 * section renders normally. The alternative, hiding things in CSS and
 * revealing them with script, means one failed request leaves a page that is
 * blank all the way down.
 *
 * IntersectionObserver, not a scroll listener: a scroll handler runs on every
 * frame of every scroll for the life of the page and reads layout while doing
 * it. This wakes only when an element actually crosses the threshold, and each
 * one is unobserved the moment it has played.
 */
export default function ScrollReveal() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const blocks = Array.from(
      document.querySelectorAll<HTMLElement>(".section > .wrap"),
    );
    if (!blocks.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          el.dataset.reveal = "in";
          // Played once. Leaving it observed would replay the animation every
          // time the reader scrolled back up, which reads as a glitch rather
          // than an effect.
          observer.unobserve(el);
          // The transition is over by now; holding a compositor layer for the
          // rest of the visit costs memory for nothing.
          setTimeout(() => {
            el.style.willChange = "auto";
          }, 1000);
        }
      },
      // Fires a little before the block reaches the viewport, so the movement
      // is finishing as it arrives rather than starting once it is already
      // being read.
      { rootMargin: "0px 0px -12% 0px", threshold: 0.06 },
    );

    for (const block of blocks) {
      // Anything already on screen at load is left alone. Animating the first
      // thing someone sees delays the page for no benefit, and it is the part
      // most likely to be mid-read when the script arrives.
      const box = block.getBoundingClientRect();
      if (box.top < window.innerHeight * 0.9) continue;

      block.dataset.reveal = "";
      observer.observe(block);
    }

    return () => observer.disconnect();
  }, []);

  return null;
}
