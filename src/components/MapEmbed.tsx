export default function MapEmbed({ query }: { query: string }) {
  return (
    <div className="mapwrap">
      <iframe
        title={`Map to ${query}`}
        src={`https://www.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </div>
  );
}
