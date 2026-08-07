"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

/**
 * Autoplays muted (the only kind browsers permit) and pauses whenever it isn't
 * on screen or the tab is hidden, so it stops decoding in the background.
 * Reduced-motion visitors get the poster frame and the video never loads.
 */
export default function VideoHero({
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
  const ref = useRef<HTMLVideoElement>(null);

  /**
   * Reduced motion is decided after mount, never during render.
   *
   * Reading `window` while rendering makes the server and the client produce
   * different markup — the server has no `window`, so it always emitted the
   * <source> while the client sometimes didn't. React can't patch that up, and
   * it's the hydration error Next reports.
   *
   * The markup is now identical on both sides; playback is what changes.
   */
  useEffect(() => {
    const v = ref.current;
    if (!v) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (mq.matches) {
      // Hold the poster frame and stop the browser fetching any more of it.
      v.pause();
      v.preload = "none";
      return;
    }

    const play = () => void v.play().catch(() => {});
    play();

    const io = new IntersectionObserver(
      ([e]) => (e.isIntersecting ? play() : v.pause()),
      { threshold: 0.05 }
    );
    io.observe(v);

    const onVis = () => (document.hidden ? v.pause() : play());
    document.addEventListener("visibilitychange", onVis);

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // "Kapi Coast" -> two stacked lines, as the poster headline
  const [first, ...rest] = cafeName.split(" ");

  return (
    <section className="vhero" id="hero">
      <div className="vhero__media">
        <video
          ref={ref}
          muted
          loop
          playsInline
          preload="metadata"
          poster={posterUrl}
          aria-label={`${cafeName} — hero video`}
        >
          <source src={videoUrl} />
        </video>
      </div>
      <div className="vhero__veil" />

      <div className="wrap vhero__inner">
        {/* Just the opening hours now. The location and the "Coffee · Chai ·
            Chaat" list that used to sit here were saying again what the name,
            the tagline and the menu already say — three labels stacked in front
            of the reader before they reach the cafe's own name. The hours are
            the one thing here that is useful at a glance. */}
        <p className="vhero__eyebrow">
          <span className="open">
            <i className="pulse" />
            {badge}
          </span>
        </p>

        <h1 className="vhero__title">
          <span className="vhero__name">
            {first}
            <br />
            {rest.join(" ")}
          </span>
          <span className="ta tamil">{tamilName}</span>
        </h1>

        <p className="vhero__tagline">{tagline}</p>

        <p className="vhero__sub">
          {line1}
          <br />
          {line2}
        </p>

        <div className="vhero__row">
          <Link className="btn" href="/menu">
            See the menu
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h13M13 6l6 6-6 6" />
            </svg>
          </Link>
          <Link className="btn btn--ghost" href="/visit">
            Find us on OMR
          </Link>
        </div>

        <p className="vhero__trust">
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

      <p className="vhero__side" aria-hidden="true">{side}</p>

      <div className="vhero__cue" aria-hidden="true">
        <span className="bar" />
        Scroll
      </div>
    </section>
  );
}
