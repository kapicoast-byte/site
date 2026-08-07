"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/* No "Cakes & Events" here. It and the "Order a cake" button beside it both led
   to the same page, so the bar asked twice for one destination — and the button
   is the clearer of the two, because it says what happens next. The page is
   still reachable from the button, from the home page's cake section, and from
   the footer. */
const LINKS = [
  { href: "/menu", label: "Menu & Recipes" },
  { href: "/journal", label: "Journal" },
  { href: "/visit", label: "Visit" },
];

export default function Nav({
  logoUrl,
  tamilName,
}: {
  logoUrl: string;
  tamilName: string;
}) {
  const pathname = usePathname();
  const [stuck, setStuck] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 24);
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, []);

  // Body class drives the burger animation and drawer, as in the original CSS.
  useEffect(() => {
    document.body.classList.toggle("menu-open", open);
    return () => document.body.classList.remove("menu-open");
  }, [open]);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className={`nav${stuck ? " is-stuck" : ""}`}>
      <div className="nav__inner">
        <Link className="brand" href="/" aria-label="Kapi Coast, home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="brand__logo"
            src={logoUrl}
            alt="Kapi Coast"
            width={52}
            height={52}
          />
          <span className="brand__ta tamil">{tamilName}</span>
        </Link>

        <nav className="nav__links" aria-label="Primary">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={pathname.startsWith(l.href) ? "page" : undefined}
            >
              {l.label}
            </Link>
          ))}
          <Link className="btn" href="/cakes#builder">
            Order a cake
          </Link>
        </nav>

        <Link className="btn nav__cta" href="/cakes#builder">
          Order a cake
        </Link>

        <button
          className="burger"
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  );
}
