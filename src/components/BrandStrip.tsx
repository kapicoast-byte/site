import type { BrandRow } from "@/lib/models";

/**
 * The other businesses in the group, scrolling past.
 *
 * No JavaScript. The movement is a CSS animation on a track that holds the
 * list twice over and translates exactly -50%, which lands the copy precisely
 * where the original started — so the loop has no seam and needs nothing
 * measuring widths at runtime.
 *
 * A brand with no logo yet shows its name set in type rather than a gap. That
 * is the normal state while logos are still being gathered, not an error, and
 * a row of mixed logos and wordmarks is what most groups' real strips look
 * like anyway.
 *
 * Renders nothing at all when there are no brands, so the home page does not
 * carry an empty band while the list is being filled in.
 */
export default function BrandStrip({
  brands,
  title,
}: {
  brands: BrandRow[];
  title: string;
}) {
  const rows = brands.filter((b) => b.name || b.logoUrl);
  if (!rows.length) return null;

  const track = [...rows, ...rows];

  return (
    <section className="brandstrip" aria-label={title}>
      <p className="brandstrip__label">{title}</p>

      <div className="brandstrip__rail">
        <div className="brandstrip__track">
          {track.map((b, i) => (
            <span
              className="brandstrip__item"
              key={i}
              /* The second pass is the same content again. Announcing it would
                 read every brand twice. */
              aria-hidden={i >= rows.length ? "true" : undefined}
            >
              {b.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.logoUrl} alt={b.name || ""} loading="lazy" />
              ) : (
                <b>{b.name}</b>
              )}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
