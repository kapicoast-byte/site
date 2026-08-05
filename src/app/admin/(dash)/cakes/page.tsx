import { db } from "@/lib/db";
import { saveCakeOption, savePackage, deletePackage } from "../../actions";

export const dynamic = "force-dynamic";

const KINDS: { kind: string; title: string; priced: string }[] = [
  { kind: "flavour", title: "Flavours", priced: "Base price for 1 kg (₹)" },
  { kind: "size", title: "Sizes", priced: "" },
  { kind: "finish", title: "Finishes", priced: "Surcharge (₹)" },
  { kind: "occasion", title: "Occasions", priced: "" },
  { kind: "addon", title: "Add-ons", priced: "Surcharge (₹)" },
];

export default async function AdminCakes() {
  const [options, packages] = await Promise.all([
    db.cakeOption.findMany({ orderBy: [{ kind: "asc" }, { order: "asc" }] }),
    db.package.findMany({ orderBy: { order: "asc" } }),
  ]);

  return (
    <>
      <div className="adm__head">
        <div>
          <h1>Cakes &amp; packages</h1>
          <p>Prices here feed the live total in the cake builder.</p>
        </div>
      </div>

      {KINDS.map(({ kind, title, priced }) => {
        const rows = options.filter((o) => o.kind === kind);
        if (!rows.length) return null;
        return (
          <div className="adm-card" key={kind}>
            <h2>{title}</h2>
            <div className="adm-wrapx">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Label</th>
                    <th>Note</th>
                    {priced && <th className="num">{priced}</th>}
                    <th>Shown</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((o) => (
                    <tr key={o.id}>
                      <td colSpan={5} style={{ padding: 0 }}>
                        <form action={saveCakeOption} style={{ display: "grid", gridTemplateColumns: priced ? "1.2fr 1.4fr .7fr .5fr auto" : "1.2fr 1.9fr .5fr auto", gap: ".5rem", alignItems: "center", padding: ".55rem .6rem" }}>
                          <input type="hidden" name="id" value={o.id} />
                          <input name="label" defaultValue={o.label} className="adm-inline" style={inputStyle} />
                          <input name="note" defaultValue={o.note} style={inputStyle} />
                          {priced && (
                            <input name="price" type="number" min={0} defaultValue={o.price} style={{ ...inputStyle, textAlign: "right" }} />
                          )}
                          <label style={{ display: "flex", gap: ".35rem", alignItems: "center", fontSize: ".8rem", color: "var(--cream-dim)" }}>
                            <input type="checkbox" name="active" defaultChecked={o.active} />
                            On
                          </label>
                          <button className="adm-btn adm-btn--ghost" type="submit" style={{ padding: ".35rem .8rem", minHeight: 0, fontSize: ".72rem" }}>
                            Save
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      <div className="adm-card">
        <h2>Event packages</h2>
        {packages.map((p) => (
          <form action={savePackage} key={p.id} style={{ borderTop: "1px solid var(--line)", paddingTop: "1rem", marginTop: "1rem" }}>
            <input type="hidden" name="id" value={p.id} />
            <div className="adm-grid">
              <div className="adm-field">
                <label>Name</label>
                <input name="name" defaultValue={p.name} />
              </div>
              <div className="adm-field">
                <label>Price</label>
                <input name="price" defaultValue={p.price} />
              </div>
              <div className="adm-field">
                <label>Unit</label>
                <input name="unit" defaultValue={p.unit} />
              </div>
            </div>
            <div className="adm-field" style={{ marginTop: ".8rem" }}>
              <label>What&apos;s included (one per line)</label>
              <textarea name="items" defaultValue={p.items.join("\n")} />
            </div>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginTop: ".8rem", flexWrap: "wrap" }}>
              <label style={{ display: "flex", gap: ".4rem", alignItems: "center", fontSize: ".88rem" }}>
                <input type="checkbox" name="hero" defaultChecked={p.hero} /> Highlight this one
              </label>
              <label style={{ display: "flex", gap: ".4rem", alignItems: "center", fontSize: ".88rem" }}>
                <input type="checkbox" name="active" defaultChecked={p.active} /> Show on the site
              </label>
              <button className="adm-btn" type="submit" style={{ marginLeft: "auto" }}>Save</button>
            </div>
          </form>
        ))}

        <form action={deletePackage} style={{ marginTop: "1.2rem" }}>
          <p style={{ fontSize: ".8rem", color: "var(--cream-dim)" }}>
            To remove a package, paste its name above into a new one, or delete by id below.
          </p>
        </form>

        <form action={savePackage} style={{ borderTop: "1px dashed var(--line)", paddingTop: "1rem", marginTop: "1rem" }}>
          <h2 style={{ marginBottom: ".8rem" }}>Add a package</h2>
          <div className="adm-grid">
            <div className="adm-field"><label>Name</label><input name="name" required /></div>
            <div className="adm-field"><label>Price</label><input name="price" placeholder="₹9,800" /></div>
            <div className="adm-field"><label>Unit</label><input name="unit" placeholder="up to 20 guests" /></div>
          </div>
          <div className="adm-field" style={{ marginTop: ".8rem" }}>
            <label>What&apos;s included (one per line)</label>
            <textarea name="items" />
          </div>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginTop: ".8rem" }}>
            <label style={{ display: "flex", gap: ".4rem", alignItems: "center", fontSize: ".88rem" }}>
              <input type="checkbox" name="active" defaultChecked /> Show on the site
            </label>
            <button className="adm-btn" type="submit" style={{ marginLeft: "auto" }}>Add package</button>
          </div>
        </form>
      </div>
    </>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--ink)",
  color: "var(--cream)",
  border: "1px solid var(--line)",
  borderRadius: 6,
  padding: ".45rem .6rem",
  fontSize: ".86rem",
  width: "100%",
};
