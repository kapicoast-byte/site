import { db } from "@/lib/db";
import MediaManager from "@/components/MediaManager";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const media = await db.media.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <>
      <div className="adm__head">
        <div>
          <h1>Images &amp; video</h1>
          <p>Upload a file, then copy its link and paste it wherever you need it.</p>
        </div>
      </div>
      <MediaManager media={media.map((m) => ({
        id: m.id,
        url: m.url,
        filename: m.filename,
        mimeType: m.mimeType,
        size: m.size,
      }))} />
    </>
  );
}
