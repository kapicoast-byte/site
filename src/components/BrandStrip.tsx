import type { BrandRow } from "@/lib/models";

/**
 * The other businesses in the group, scrolling past.
 *
 * Every entry is a mark AND a name, together. An earlier version showed one or
 * the other — the logo if there was one, the name if there wasn't — which made
 * a row of mismatched things and meant a logo nobody recognises arrived with
 * nothing to identify it. A brand with no logo yet gets a monogram, so the row
 * is consistent from the first day and gets better as real logos arrive rather
 * than looking broken until they do.
 *
 * No JavaScript. The track holds the list twice over and translates exactly
 * -50%, which lands the copy precisely where the original started — so the loop
 * has no seam and nothing has to measure widths at runtime.
 *
 * Renders nothing at all when there are no brands, so the page never carries an
 * empty band while the list is being filled in.
 */

/** Up to two initials, for the monogram shown until a real logo exists. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "•";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export default function BrandStrip({
  brands,
  title,
}: {
  brands: BrandRow[];
  title: string;
}) {
  // `?? []` is not belt-and-braces. Firestore omits absent fields, so any
  // settings document written before `brands` existed has no key for it.
  const rows = (brands ?? []).filter((b) => b.name || b.logoUrl);
  if (!rows.length) return null;

  /* The track has to be at least twice the rail's width or translateX(-50%)
     drags a visible hole across the strip. Repeating until each half fills the
     rail covers a short list; the halves stay identical by construction —
     `half` is built once and duplicated, never derived twice. */
  const perHalf = Math.max(1, Math.ceil(6 / rows.length));
  const half = Array.from({ length: perHalf }, () => rows).flat();
  const track = [...half, ...half];

  return (
    <section className="brandstrip" aria-label={title}>
      <p className="brandstrip__label">{title}</p>

      <div className="brandstrip__rail">
        <div className="brandstrip__track">
          {track.map((b, i) => (
            <span
              className="brandstrip__item"
              key={i}
              /* Everything past the first pass is a repeat, present only to
                 fill the rail. Announcing it would read every brand twice. */
              aria-hidden={i >= rows.length ? "true" : undefined}
              data-dup={i >= rows.length ? "" : undefined}
            >
              {b.logoUrl ? (
                <span className="brandstrip__logo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.logoUrl} alt="" loading="lazy" />
                </span>
              ) : (
                <span className="brandstrip__mono" aria-hidden="true">
                  {initials(b.name)}
                </span>
              )}
              <b>{b.name}</b>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
