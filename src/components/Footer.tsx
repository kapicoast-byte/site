import Link from "next/link";
import { hoursOf, type SettingsRecord } from "@/lib/settings";

export default function Footer({ s }: { s: SettingsRecord }) {
  const hours = hoursOf(s);
  const brief = [
    `Mon – Thu · ${hours[0]?.time ?? ""}`,
    `Fri – Sat · ${hours[4]?.time ?? ""}`,
    `Sunday · ${hours[6]?.time ?? ""}`,
  ];

  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot__grid">
          <div>
            <div className="foot__logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.logoDarkUrl} alt={s.cafeName} width={56} height={56} />
              <div className="tamil gold" style={{ fontSize: ".82rem" }}>
                {s.tamilName}
              </div>
            </div>
            <p
              style={{
                color: "var(--cream-dim)",
                maxWidth: "34ch",
                fontSize: "var(--fs-sm)",
              }}
            >
              Filter kapi, kadak chai, chaat and street eats. On OMR since the
              fields turned into flyovers.
            </p>
          </div>

          <div>
            <h3 className="foot__h">Explore</h3>
            <ul>
              <li><Link href="/menu">Menu &amp; recipes</Link></li>
              <li><Link href="/cakes">Order a cake</Link></li>
              <li><Link href="/cakes#packages">Event packages</Link></li>
              <li><Link href="/journal">Journal</Link></li>
              <li><Link href="/visit">Visit us</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="foot__h">Find us</h3>
            {/* An address is one thing, not a list of unrelated items — so it
                is an <address> with line breaks rather than five <li>s, which
                is also what a screen reader needs to read it as one block. */}
            <address className="foot__addr">
              {s.addressL1}
              <br />
              {s.addressL2}
              <br />
              {s.addressL3}
            </address>
            {/* The number is the most useful thing in a cafe's footer, so it
                is set to be found rather than filed among the links. */}
            <a className="foot__phone" href={`tel:${s.phone.replace(/\s/g, "")}`}>
              {s.phone}
            </a>
            {s.email && (
              <a className="foot__mail" href={`mailto:${s.email}`}>
                {s.email}
              </a>
            )}
          </div>

          <div>
            <h3 className="foot__h">Hours</h3>
            <ul>
              {brief.map((h) => (
                <li key={h}>{h}</li>
              ))}
              <li style={{ color: "var(--gold)" }}>Filter kapi till it runs out</li>
            </ul>
          </div>
        </div>

        <div className="foot__bottom">
          <span>
            © {new Date().getFullYear()} {s.cafeName} · {s.tamilName} · Chennai
          </span>
          <span className="foot__legal">
            <Link href="/terms">Terms &amp; Conditions</Link>
            <Link href="/privacy">Privacy Policy</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
