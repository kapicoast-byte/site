"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Crop a photo before it is uploaded.
 *
 * One photo feeds two different shapes on the site — the recipe panel is 16:10
 * and the menu card thumbnail is a square — so the default is 16:10 with the
 * square available, and the guides show where the thumbnail will cut.
 *
 * The crop rectangle is held in the image's own pixel coordinates, not screen
 * pixels. That way it stays correct when the window resizes and the export is
 * exact rather than scaled twice.
 *
 * Cropping happens on the canvas here, so what leaves the browser is already
 * trimmed and no larger than the server would keep anyway. The upload is
 * smaller and lib/uploads.ts still does the final WebP encode.
 */

type Rect = { x: number; y: number; w: number; h: number };
type Handle = "nw" | "ne" | "sw" | "se";

const RATIOS = [
  { key: "wide", label: "16:10", hint: "Recipe panel", value: 16 / 10 },
  { key: "square", label: "1:1", hint: "Card thumbnail", value: 1 },
  { key: "free", label: "Free", hint: "Any shape", value: 0 },
];

/** Matches MAX_EDGE in lib/uploads.ts — exporting bigger would just be thrown away. */
const MAX_EDGE = 1800;
const MIN_SIZE = 48; // image px, stops the box collapsing to nothing

/** Largest rectangle of the given ratio that fits, centred. */
function centred(natW: number, natH: number, ratio: number): Rect {
  if (!ratio) return { x: 0, y: 0, w: natW, h: natH };
  let w = natW;
  let h = w / ratio;
  if (h > natH) {
    h = natH;
    w = h * ratio;
  }
  return { x: (natW - w) / 2, y: (natH - h) / 2, w, h };
}

function clamp(r: Rect, natW: number, natH: number): Rect {
  const w = Math.min(r.w, natW);
  const h = Math.min(r.h, natH);
  return {
    w,
    h,
    x: Math.max(0, Math.min(r.x, natW - w)),
    y: Math.max(0, Math.min(r.y, natH - h)),
  };
}

export default function ImageCropper({
  file,
  onCancel,
  onDone,
}: {
  file: File;
  onCancel: () => void;
  onDone: (cropped: File) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [ratio, setRatio] = useState(16 / 10);
  const [rect, setRect] = useState<Rect | null>(null);
  const [busy, setBusy] = useState(false);
  /** Quarter turns clockwise, 0–3. Applied to the canvas on export. */
  const [turns, setTurns] = useState(0);

  const imgRef = useRef<HTMLImageElement>(null);

  /* Builds what the cropper displays: the file itself, or a rotated copy.
     Everything downstream — the box, the drag maths, the export — then works on
     an already-upright image and needs to know nothing about rotation.

     The object URL is created inside the effect, not in useState. Created in an
     initialiser, React's development remount would revoke it and then hand the
     same dead URL back — the image silently fails to load. Each setup here
     makes its own URL and revokes only that one.

     Rotation always starts from the original file rather than the previous
     rotation, so turning the photo four times costs one re-encode, not four. */
  useEffect(() => {
    let cancelled = false;
    let made: string | null = null;

    const publish = (u: string) => {
      made = u;
      if (cancelled) URL.revokeObjectURL(u);
      else setUrl(u);
    };

    if (turns === 0) {
      publish(URL.createObjectURL(file));
    } else {
      const src = URL.createObjectURL(file);
      (async () => {
        try {
          const img = new Image();
          img.src = src;
          await img.decode();

          const quarter = turns % 2 === 1; // 90° or 270° — the sides swap
          const canvas = document.createElement("canvas");
          canvas.width = quarter ? img.naturalHeight : img.naturalWidth;
          canvas.height = quarter ? img.naturalWidth : img.naturalHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.imageSmoothingQuality = "high";
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((turns * Math.PI) / 2);
          ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

          const blob = await new Promise<Blob | null>((res) =>
            canvas.toBlob(res, "image/webp", 0.98),
          );
          if (blob) publish(URL.createObjectURL(blob));
        } finally {
          URL.revokeObjectURL(src);
        }
      })();
    }

    return () => {
      cancelled = true;
      if (made) URL.revokeObjectURL(made);
    };
  }, [file, turns]);

  // Escape closes, like the recipe drawer on the public site.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [onCancel]);

  const onLoad = () => {
    const el = imgRef.current;
    if (!el) return;
    // naturalWidth is already EXIF-oriented in current browsers, and so is what
    // drawImage puts on the canvas — a sideways phone photo crops upright.
    setNat({ w: el.naturalWidth, h: el.naturalHeight });
    setRect(centred(el.naturalWidth, el.naturalHeight, ratio));
  };

  const pickRatio = (value: number) => {
    setRatio(value);
    if (!nat) return;
    if (!value) return; // free — keep whatever box is there
    setRect((prev) => {
      if (!prev) return centred(nat.w, nat.h, value);
      // Keep the centre, refit to the new ratio.
      const cx = prev.x + prev.w / 2;
      const cy = prev.y + prev.h / 2;
      let w = prev.w;
      let h = w / value;
      if (h > nat.h) {
        h = nat.h;
        w = h * value;
      }
      if (w > nat.w) {
        w = nat.w;
        h = w / value;
      }
      return clamp({ x: cx - w / 2, y: cy - h / 2, w, h }, nat.w, nat.h);
    });
  };

  /** Screen px -> image px for the currently displayed size. */
  const scale = useCallback(() => {
    const el = imgRef.current;
    if (!el || !nat) return 1;
    return nat.w / el.getBoundingClientRect().width;
  }, [nat]);

  /* ----------------------------------------------------------- dragging -- */

  const drag = useRef<{
    mode: "move" | Handle;
    startX: number;
    startY: number;
    start: Rect;
  } | null>(null);

  const begin = (mode: "move" | Handle) => (e: React.PointerEvent) => {
    if (!rect) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode, startX: e.clientX, startY: e.clientY, start: { ...rect } };
  };

  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !nat) return;
    const k = scale();
    const dx = (e.clientX - d.startX) * k;
    const dy = (e.clientY - d.startY) * k;
    const s = d.start;

    if (d.mode === "move") {
      setRect(clamp({ ...s, x: s.x + dx, y: s.y + dy }, nat.w, nat.h));
      return;
    }

    // Resize from a corner: the opposite corner stays put.
    const right = s.x + s.w;
    const bottom = s.y + s.h;
    let x = s.x;
    let y = s.y;
    let w = s.w;
    let h = s.h;

    if (d.mode === "se") { w = s.w + dx; h = s.h + dy; }
    if (d.mode === "sw") { w = s.w - dx; h = s.h + dy; x = right - w; }
    if (d.mode === "ne") { w = s.w + dx; h = s.h - dy; y = bottom - h; }
    if (d.mode === "nw") { w = s.w - dx; h = s.h - dy; x = right - w; y = bottom - h; }

    if (ratio) {
      // Locked ratio: width leads, height follows, re-anchored to the corner.
      h = w / ratio;
      if (d.mode === "nw" || d.mode === "ne") y = bottom - h;
      if (d.mode === "nw" || d.mode === "sw") x = right - w;
    }

    if (w < MIN_SIZE || h < MIN_SIZE) return;
    // Refuse rather than silently shrink when a corner runs off the image.
    if (x < 0 || y < 0 || x + w > nat.w || y + h > nat.h) return;
    setRect({ x, y, w, h });
  };

  const end = (e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement;
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    drag.current = null;
  };

  /** Arrow keys nudge the box — the whole thing is otherwise mouse-only. */
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!rect || !nat) return;
    const step = e.shiftKey ? 20 : 4;
    const by: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0], ArrowRight: [step, 0],
      ArrowUp: [0, -step], ArrowDown: [0, step],
    };
    const d = by[e.key];
    if (!d) return;
    e.preventDefault();
    setRect(clamp({ ...rect, x: rect.x + d[0], y: rect.y + d[1] }, nat.w, nat.h));
  };

  /* ------------------------------------------------------------- export -- */

  const apply = async () => {
    const img = imgRef.current;
    if (!img || !rect) return;
    setBusy(true);
    try {
      let w = Math.round(rect.w);
      let h = Math.round(rect.h);
      const long = Math.max(w, h);
      if (long > MAX_EDGE) {
        const k = MAX_EDGE / long;
        w = Math.round(w * k);
        h = Math.round(h * k);
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas unavailable");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, w, h);

      const blob =
        (await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", 0.95))) ??
        (await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.95)));
      if (!blob) throw new Error("could not read the cropped image");

      const ext = blob.type === "image/webp" ? "webp" : "jpg";
      const base = file.name.replace(/\.[^.]+$/, "") || "photo";
      onDone(new File([blob], `${base}.${ext}`, { type: blob.type }));
    } finally {
      setBusy(false);
    }
  };

  // Percentages, so the overlay tracks the image at any display size.
  const pc = (v: number, of: number) => `${(v / of) * 100}%`;

  return (
    <div className="crop" role="dialog" aria-modal="true" aria-label="Crop the photo">
      <div className="crop__panel">
        <div className="crop__head">
          <div>
            <h3>Crop the photo</h3>
            <p>
              Drag the box to move it, or pull a corner to resize.
              {nat && ` Original ${nat.w}×${nat.h}.`}
            </p>
          </div>
          <button type="button" className="xbtn" onClick={onCancel} aria-label="Cancel crop">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="crop__ratios" role="group" aria-label="Crop shape">
          {RATIOS.map((r) => (
            <button
              key={r.key}
              type="button"
              className={`crop__ratio${ratio === r.value ? " is-on" : ""}`}
              onClick={() => pickRatio(r.value)}
              aria-pressed={ratio === r.value}
            >
              <b>{r.label}</b>
              <span>{r.hint}</span>
            </button>
          ))}

          <span className="crop__sep" aria-hidden="true" />

          <button
            type="button"
            className="crop__turn"
            onClick={() => setTurns((t) => (t + 3) % 4)}
            aria-label="Rotate left"
            title="Rotate left"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 5 4 10l5 5" />
              <path d="M4 10h9a7 7 0 0 1 7 7v2" />
            </svg>
          </button>
          <button
            type="button"
            className="crop__turn"
            onClick={() => setTurns((t) => (t + 1) % 4)}
            aria-label="Rotate right"
            title="Rotate right"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m15 5 5 5-5 5" />
              <path d="M20 10h-9a7 7 0 0 0-7 7v2" />
            </svg>
          </button>
        </div>

        <div className="crop__stage">
          {/* Shrink-wraps the image so the crop box's percentages are measured
              against the photo itself, not the padded stage around it. */}
          <div className="crop__canvas">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {url && <img ref={imgRef} src={url} alt="" onLoad={onLoad} draggable={false} />}

          {nat && rect && (
            <div
              className="crop__box"
              tabIndex={0}
              onKeyDown={onKeyDown}
              onPointerDown={begin("move")}
              onPointerMove={move}
              onPointerUp={end}
              onPointerCancel={end}
              style={{
                left: pc(rect.x, nat.w),
                top: pc(rect.y, nat.h),
                width: pc(rect.w, nat.w),
                height: pc(rect.h, nat.h),
              }}
            >
              {/* Where the square card thumbnail will cut from this crop. */}
              <span className="crop__thumbguide" aria-hidden="true" />
              {(["nw", "ne", "sw", "se"] as Handle[]).map((h) => (
                <span
                  key={h}
                  className={`crop__h crop__h--${h}`}
                  onPointerDown={begin(h)}
                  onPointerMove={move}
                  onPointerUp={end}
                  onPointerCancel={end}
                />
              ))}
            </div>
          )}
          </div>
        </div>

        <div className="crop__foot">
          <span className="hint">
            {rect ? `Crop ${Math.round(rect.w)}×${Math.round(rect.h)}` : "Loading…"}
            {rect && Math.max(rect.w, rect.h) > MAX_EDGE && ` — saved at ${MAX_EDGE}px`}
          </span>
          <div className="crop__actions">
            <button type="button" className="adm-btn adm-btn--ghost" onClick={onCancel}>
              Cancel
            </button>
            {/* Cropping is an option, not a toll gate — one click skips it. */}
            <button type="button" className="adm-btn adm-btn--ghost" onClick={() => onDone(file)}>
              Use full photo
            </button>
            <button type="button" className="adm-btn" onClick={apply} disabled={!rect || busy}>
              {busy ? "Cropping…" : "Use this crop"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
