"use client";

import { useEffect } from "react";

/**
 * A light that follows the pointer across a card.
 *
 * Mounted once in the layout. It renders nothing and takes no props — it finds
 * the cards itself, so no page or component had to be edited to opt in and
 * nothing has to be remembered when a new grid is added.
 *
 * One listener on the document rather than two per card. With four dish cards,
 * three journal cards and the packages, per-card listeners would be dozens of
 * registrations for an effect that only ever applies to the one card under the
 * pointer; `pointerover` bubbles, so one delegated listener covers every card
 * that exists now or is rendered later.
 *
 * The work per move is two custom properties on one element. No layout is read
 * inside the move handler except the hovered card's own box, which is cached
 * for the duration of that hover — calling getBoundingClientRect on every
 * pointermove is what turns this kind of effect into jank.
 */
export default function CardSpotlight() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // A spotlight that follows a finger is a spotlight stuck wherever the
    // finger last was. Pointer devices only.
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let active: HTMLElement | null = null;
    let box: DOMRect | null = null;

    const onOver = (e: Event) => {
      const card = (e.target as HTMLElement)?.closest<HTMLElement>(".card, .pkg");
      if (!card || card === active) return;
      if (active) active.style.removeProperty("--spot");
      active = card;
      box = card.getBoundingClientRect();
      card.style.setProperty("--spot", "1");
    };

    const onMove = (e: PointerEvent) => {
      if (!active || !box) return;
      active.style.setProperty("--mx", `${((e.clientX - box.left) / box.width) * 100}%`);
      active.style.setProperty("--my", `${((e.clientY - box.top) / box.height) * 100}%`);
    };

    const onOut = (e: Event) => {
      const to = (e as PointerEvent).relatedTarget as HTMLElement | null;
      // pointerout fires when moving between a card's own children too.
      if (active && to && active.contains(to)) return;
      if (active) active.style.removeProperty("--spot");
      active = null;
      box = null;
    };

    // The box moves when the page does, and a stale one puts the light in the
    // wrong place. Cheaper to re-read on scroll than on every move.
    const onScroll = () => {
      if (active) box = active.getBoundingClientRect();
    };

    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onOut, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onOut);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return null;
}
