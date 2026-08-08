/**
 * The scrolling band.
 *
 * Any item that is a phone number becomes a WhatsApp link when `whatsapp` is
 * supplied, so the number in the band is the thing you press rather than a
 * number to memorise and retype. That is the whole point of putting it there.
 *
 * The container is no longer `aria-hidden`. It was, on the grounds that a
 * scrolling decorative strip is noise — but a link inside an aria-hidden
 * subtree is focusable while being invisible to a screen reader, which is a
 * keyboard trap that announces nothing. Only the duplicate half is hidden now,
 * and its links are taken out of the tab order so the same number is not two
 * tab stops.
 */

/** Loose on purpose: any run of digits, spaces, dashes and a leading +. */
const PHONE = /^\+?[\d][\d\s\-()]{7,}$/;

export default function Marquee({
  items,
  red = false,
  whatsapp,
}: {
  items: string[];
  red?: boolean;
  /** Digits with country code, no punctuation. Blank disables linking. */
  whatsapp?: string;
}) {
  if (!items.length) return null;

  /* Repeated until a half is long enough to cross a wide screen, then
     duplicated. `translateX(-50%)` only looks continuous while the track is at
     least twice the viewport — with three short phrases on a wide monitor the
     list runs out mid-screen and a blank gap slides past before it restarts.
     The halves are identical by construction: `half` is built once and copied,
     never derived twice. */
  const perHalf = Math.max(1, Math.ceil(8 / items.length));
  const half = Array.from({ length: perHalf }, () => items).flat();
  const track = [...half, ...half];
  const href = whatsapp
    ? `https://wa.me/${whatsapp.replace(/\D/g, "")}`
    : null;

  return (
    <div className={`marquee${red ? " marquee--red" : ""}`}>
      <div className="marquee__track">
        {track.map((t, i) => {
          // Everything after the first pass through the real list is a repeat,
          // whether it is inside the first half or the second. Keyed off
          // items.length, not half.length: the half itself contains repeats,
          // and marking only the second half would leave the same number as
          // several tab stops announcing the same thing.
          const dup = i >= items.length;
          const linkable = href && PHONE.test(t.trim());

          return (
            <span key={i} aria-hidden={dup ? "true" : undefined}>
              {linkable ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  // The second pass is the same number again; letting it take
                  // focus would mean tabbing through the band twice.
                  tabIndex={dup ? -1 : undefined}
                >
                  {t}
                </a>
              ) : (
                t
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
