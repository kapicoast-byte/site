"use client";

import { useActionState, useState } from "react";
import { uploadMedia, removeMedia, type ActionState } from "@/app/admin/actions";

type Item = {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
};

const kb = (n: number) =>
  n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;

export default function MediaManager({ media }: { media: Item[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(uploadMedia, null);
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      /* clipboard blocked — the URL is visible under the thumbnail anyway */
    }
  }

  return (
    <>
      <div className="adm-card">
        <h2>Upload</h2>
        {state?.error && <div className="adm-err">{state.error}</div>}
        {state?.ok && <div className="adm-note">{state.ok}</div>}

        <form action={action}>
          <div className="adm-field">
            <label htmlFor="files">Choose files</label>
            <input
              id="files"
              name="files"
              type="file"
              multiple
              accept="image/*,video/mp4,video/webm"
            />
            <span className="hint">
              JPG, PNG, WebP, AVIF, GIF, MP4 or WebM. Up to 25 MB each. Pictures
              are re-encoded to WebP so pages load faster. SVG is not accepted —
              it can carry scripts, and these files are served from our own address.
            </span>
          </div>
          <div className="adm-field" style={{ marginTop: ".8rem" }}>
            <label htmlFor="alt">Description (for screen readers)</label>
            <input id="alt" name="alt" placeholder="The counter at 6 am" />
          </div>
          <button className="adm-btn" type="submit" disabled={pending} style={{ marginTop: "1rem" }}>
            {pending ? "Uploading…" : "Upload"}
          </button>
        </form>
      </div>

      <div className="adm-card">
        <h2>Library ({media.length})</h2>
        {media.length === 0 && (
          <p style={{ color: "var(--cream-dim)", fontSize: ".9rem" }}>
            Nothing uploaded yet.
          </p>
        )}
        <div className="adm-media">
          {media.map((m) => (
            <figure key={m.id}>
              {m.mimeType.startsWith("video/") ? (
                <video src={m.url} muted playsInline preload="metadata" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt={m.filename} />
              )}
              <figcaption>
                {m.filename}
                <br />
                {kb(m.size)}
              </figcaption>
              <div className="row">
                <button type="button" onClick={() => copy(m.url)}>
                  {copied === m.url ? "Copied ✓" : "Copy link"}
                </button>
                <form action={removeMedia} style={{ display: "inline" }}>
                  <input type="hidden" name="id" value={m.id} />
                  <button type="submit">Delete</button>
                </form>
              </div>
            </figure>
          ))}
        </div>
      </div>
    </>
  );
}
