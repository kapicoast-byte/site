"use client";

import { useId, useState } from "react";
import MediaField from "./MediaField";
import type { BrandRow } from "@/lib/models";

/**
 * The list of businesses shown in the strip on the home page.
 *
 * Every row posts under the same two names — `brandName` and `brandLogo` — so
 * the save action reads them with getAll() and zips the two arrays. FormData
 * preserves document order, which means the order of the rows on screen is the
 * order they appear on the site, and reordering needs no index bookkeeping in
 * the markup at all.
 *
 * Rows carry a key that is generated once and never reused. Using the array
 * index instead would make React match row 2's inputs to row 1's after a
 * deletion, and since these inputs are uncontrolled the DOM would keep the
 * typed values while the names shifted underneath them — one row's logo
 * silently saved against another row's name.
 */
type Row = BrandRow & { key: string };

export default function BrandsEditor({ brands }: { brands: BrandRow[] }) {
  const base = useId();
  const [seq, setSeq] = useState(0);
  const [rows, setRows] = useState<Row[]>(() =>
    brands.map((b, i) => ({ ...b, key: `${base}-seed-${i}` })),
  );

  const add = () => {
    setRows((r) => [...r, { name: "", logoUrl: "", key: `${base}-new-${seq}` }]);
    setSeq((n) => n + 1);
  };

  const remove = (key: string) => setRows((r) => r.filter((x) => x.key !== key));

  return (
    <div className="adm-brands">
      {rows.length === 0 && (
        <p className="hint" style={{ marginBottom: ".9rem" }}>
          No brands yet. The strip is hidden on the home page until you add one,
          so nothing empty is shown in the meantime.
        </p>
      )}

      {rows.map((row, i) => (
        <div className="adm-brandrow" key={row.key}>
          <div className="adm-field">
            <label htmlFor={`brandName_${row.key}`}>Name</label>
            <input
              id={`brandName_${row.key}`}
              name="brandName"
              defaultValue={row.name}
              placeholder="The business name"
            />
          </div>

          <MediaField
            name="brandLogo"
            uid={row.key}
            label="Logo"
            defaultValue={row.logoUrl}
            hint="A wide wordmark or a square mark both work — they are matched by height, not width. Leave it empty and the name is set in type instead."
          />

          <button
            type="button"
            className="adm-btn adm-btn--ghost adm-brandrow__x"
            onClick={() => remove(row.key)}
            aria-label={`Remove ${row.name || `brand ${i + 1}`}`}
          >
            Remove
          </button>
        </div>
      ))}

      <button type="button" className="adm-btn adm-btn--ghost" onClick={add}>
        Add a brand
      </button>
    </div>
  );
}
