"use client";

import { useEffect, useMemo, useState } from "react";

export type Option = {
  id: string;
  key: string;
  label: string;
  note: string;
  price: number;
  multiplier: number;
  tierColor: string;
  frostColor: string;
  heightPx: number;
};

const rupee = (n: number) => "₹" + n.toLocaleString("en-IN");

export default function CakeBuilder({
  flavours,
  sizes,
  finishes,
  occasions,
  addons,
  whatsapp,
  phone,
  email,
}: {
  flavours: Option[];
  sizes: Option[];
  finishes: Option[];
  occasions: Option[];
  addons: Option[];
  whatsapp: string;
  phone: string;
  email: string;
}) {
  const [occasion, setOccasion] = useState(occasions[0]?.key ?? "");
  const [flavour, setFlavour] = useState(flavours[0]?.key ?? "");
  const [size, setSize] = useState(sizes[1]?.key ?? sizes[0]?.key ?? "");
  const [finish, setFinish] = useState(finishes[0]?.key ?? "");
  const [picked, setPicked] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  // Empty on both server and first client render, then filled after mount.
  // Computing a date during render would give the server and the client
  // different values whenever their clocks straddle midnight — the same class
  // of hydration mismatch as reading `window`.
  const [when, setWhen] = useState("");
  const [slot, setSlot] = useState("Afternoon · 12 pm – 4 pm");
  const [name, setName] = useState("");
  const [tel, setTel] = useState("");
  const [notes, setNotes] = useState("");
  const [sent, setSent] = useState<null | { text: string; total: number }>(null);
  const [error, setError] = useState("");

  // Earliest collection date — 48 hours out. Set after mount for the same reason.
  const [minDate, setMinDate] = useState("");
  useEffect(() => {
    const soonest = new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10);
    setMinDate(soonest);
    setWhen((current) => current || soonest);
  }, []);

  const sel = useMemo(() => {
    const f = flavours.find((o) => o.key === flavour) ?? flavours[0];
    const z = sizes.find((o) => o.key === size) ?? sizes[0];
    const fi = finishes.find((o) => o.key === finish) ?? finishes[0];
    const oc = occasions.find((o) => o.key === occasion) ?? occasions[0];
    const adds = addons.filter((a) => picked.includes(a.key));

    const base = f && z ? Math.round((f.price * (z.multiplier / 100)) / 10) * 10 : 0;
    const extras = (fi?.price ?? 0) + adds.reduce((s, a) => s + a.price, 0);
    return { f, z, fi, oc, adds, base, extras, total: base + extras };
  }, [flavour, size, finish, occasion, picked, flavours, sizes, finishes, occasions, addons]);

  const grow = sel.z ? sel.z.heightPx / 104 : 1;
  const showCandle = sel.oc?.key === "birthday" || picked.includes("candles");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !tel.trim() || !when) {
      setError("We need a name, a phone number and a date before we can take this order.");
      return;
    }
    setError("");

    const dateText = new Date(when).toLocaleDateString("en-IN", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

    const text = [
      "KAPI COAST — cake order",
      "",
      `Name: ${name}`,
      `Phone: ${tel}`,
      `For: ${dateText}, ${slot}`,
      "",
      `Occasion: ${sel.oc?.label ?? "—"}`,
      `Flavour: ${sel.f?.label ?? "—"}`,
      `Size: ${sel.z?.label ?? "—"} — ${sel.z?.note ?? ""}`,
      `Finish: ${sel.fi?.label ?? "—"}`,
      `Add-ons: ${sel.adds.length ? sel.adds.map((a) => a.label).join(", ") : "none"}`,
      msg ? `Message on cake: "${msg}"` : null,
      notes ? `Notes: ${notes}` : null,
      "",
      `Estimated total: ${rupee(sel.total)}`,
    ].filter(Boolean).join("\n");

    setSent({ text, total: sel.total });
  }

  const optionSet = (
    items: Option[],
    value: string,
    onChange: (k: string) => void,
    nameAttr: string
  ) => (
    <div className="opts">
      {items.map((o) => (
        <label className="opt" key={o.id}>
          <input
            type="radio"
            name={nameAttr}
            value={o.key}
            checked={value === o.key}
            onChange={() => onChange(o.key)}
          />
          <span>
            {o.label}
            {o.note && <small>{o.note}</small>}
            {o.price > 0 && nameAttr !== "flavour" && (
              <small className="gold">+{rupee(o.price)}</small>
            )}
          </span>
        </label>
      ))}
    </div>
  );

  return (
    <form className="builder" onSubmit={submit} noValidate>
      <div>
        <fieldset className="fieldset">
          <legend>1 · What are we celebrating</legend>
          {optionSet(occasions, occasion, setOccasion, "occasion")}
        </fieldset>

        <fieldset className="fieldset">
          <legend>2 · Flavour</legend>
          {optionSet(flavours, flavour, setFlavour, "flavour")}
        </fieldset>

        <fieldset className="fieldset">
          <legend>3 · Size</legend>
          {optionSet(sizes, size, setSize, "size")}
        </fieldset>

        <fieldset className="fieldset">
          <legend>4 · Finish</legend>
          {optionSet(finishes, finish, setFinish, "finish")}
        </fieldset>

        <fieldset className="fieldset">
          <legend>5 · Add-ons</legend>
          <div className="opts">
            {addons.map((a) => (
              <label className="opt" key={a.id}>
                <input
                  type="checkbox"
                  checked={picked.includes(a.key)}
                  onChange={() =>
                    setPicked((p) =>
                      p.includes(a.key) ? p.filter((x) => x !== a.key) : [...p, a.key]
                    )
                  }
                />
                <span>
                  {a.label}
                  {a.note && <small>{a.note}</small>}
                  <small className={a.price ? "gold" : ""}>
                    {a.price ? "+" + rupee(a.price) : "Free"}
                  </small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="fieldset">
          <legend>6 · The details</legend>

          <div className="field">
            <label htmlFor="msg">Message on the cake</label>
            <input id="msg" maxLength={40} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Happy Birthday, Amma" />
            <span className="hint">Up to 40 characters, piped by hand.</span>
          </div>

          <div className="two-col">
            <div className="field">
              <label htmlFor="when">Collection / delivery date</label>
              <input id="when" type="date" min={minDate} value={when} onChange={(e) => setWhen(e.target.value)} required />
              <span className="hint">48 hours minimum.</span>
            </div>
            <div className="field">
              <label htmlFor="slot">Time</label>
              <select id="slot" value={slot} onChange={(e) => setSlot(e.target.value)}>
                <option>Morning · 8 am – 11 am</option>
                <option>Afternoon · 12 pm – 4 pm</option>
                <option>Evening · 5 pm – 9 pm</option>
              </select>
            </div>
          </div>

          <div className="two-col">
            <div className="field">
              <label htmlFor="name">Your name</label>
              <input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Name" />
            </div>
            <div className="field">
              <label htmlFor="tel">Phone / WhatsApp</label>
              <input id="tel" type="tel" inputMode="tel" value={tel} onChange={(e) => setTel(e.target.value)} required placeholder="98400 00000" />
            </div>
          </div>

          <div className="field">
            <label htmlFor="notes">Anything else</label>
            <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Allergies, colour scheme, how far it has to travel…" />
          </div>
        </fieldset>
      </div>

      <aside>
        <div className="summary">
          <div className="cake-vis" aria-hidden="true">
            <div
              className="tier"
              style={{
                transform: `scaleY(${grow})`,
                ["--grow" as string]: String(grow),
                ["--tier" as string]: sel.f?.tierColor,
                ["--frost" as string]: sel.f?.frostColor,
              }}
            >
              <span className="candle" style={{ display: showCandle ? "block" : "none" }} />
            </div>
          </div>

          <h3>Your cake</h3>
          <div className="slines">
            <div className="sline"><span>Occasion</span><b>{sel.oc?.label}</b></div>
            <div className="sline">
              <span>{sel.f?.label} · {sel.z?.label}</span><b>{rupee(sel.base)}</b>
            </div>
            <div className="sline">
              <span>{sel.fi?.label}</span>
              <b>{sel.fi?.price ? "+" + rupee(sel.fi.price) : "Included"}</b>
            </div>
            {sel.adds.map((a) => (
              <div className="sline sline--add" key={a.id}>
                <span>{a.label}</span><b>{a.price ? "+" + rupee(a.price) : "Free"}</b>
              </div>
            ))}
            <div className="sline"><span>Serves</span><b>{sel.z?.note}</b></div>
          </div>

          <div className="stotal">
            <span>Estimated total</span>
            <b>{rupee(sel.total)}</b>
          </div>

          <button className="btn btn--red" type="submit">Send this order</button>

          {error && (
            <p style={{ color: "var(--kumkum-lit)", fontSize: "var(--fs-sm)", marginTop: ".8rem" }}>
              {error}
            </p>
          )}

          {sent && (
            <div className="note" style={{ marginTop: "1rem" }}>
              <b>Order ready to send</b>
              <span style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", marginTop: ".8rem" }}>
                <a
                  className="btn"
                  href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(sent.text)}`}
                  target="_blank"
                  rel="noopener"
                >
                  Send on WhatsApp
                </a>
                <a
                  className="btn btn--ghost"
                  href={`mailto:${email}?subject=${encodeURIComponent("Cake order — Kapi Coast")}&body=${encodeURIComponent(sent.text)}`}
                >
                  Email it
                </a>
              </span>
            </div>
          )}

          <p className="fineprint">
            Sends the summary to our WhatsApp — nothing is charged here. Call{" "}
            <a className="gold" href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a>{" "}
            for anything under 48 hours.
          </p>
        </div>
      </aside>
    </form>
  );
}
