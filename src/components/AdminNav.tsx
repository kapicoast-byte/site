"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/menu", label: "Menu & recipes" },
  { href: "/admin/journal", label: "Journal" },
  { href: "/admin/cakes", label: "Cakes & packages" },
  { href: "/admin/media", label: "Images & video" },
  { href: "/admin/pages", label: "Terms & Privacy" },
  { href: "/admin/settings", label: "Site settings" },
];

export default function AdminNav() {
  const path = usePathname();
  return (
    <nav className="adm__nav">
      {LINKS.map((l) => {
        const on = l.exact ? path === l.href : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} className={on ? "is-on" : ""}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
