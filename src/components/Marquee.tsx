export default function Marquee({
  items,
  red = false,
}: {
  items: string[];
  red?: boolean;
}) {
  if (!items.length) return null;
  // Duplicated so the CSS translate(-50%) loop is seamless.
  const track = [...items, ...items];
  return (
    <div className={`marquee${red ? " marquee--red" : ""}`} aria-hidden="true">
      <div className="marquee__track">
        {track.map((t, i) => (
          <span key={i}>{t}</span>
        ))}
      </div>
    </div>
  );
}
