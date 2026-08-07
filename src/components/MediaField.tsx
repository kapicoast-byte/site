"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { uploadOne } from "@/app/admin/actions";
import ImageCropper from "./ImageCropper";

/**
 * A picture, in place.
 *
 * Replaces the old workflow — upload under "Images & video", press Copy link,
 * come back here, paste the address into a text box — with choosing the file
 * where the picture actually goes. The address still exists, and the form still
 * posts it under `name`, so nothing on the server side changed.
 *
 * The file input carries no `name`, so the file itself is never part of the
 * form submission. By the time you press Save it has already been uploaded and
 * all that is left to send is a short string.
 */
export default function MediaField({
  name,
  label,
  defaultValue = "",
  hint,
  video = false,
  crop = true,
  uid,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  hint?: string;
  /** Accept a video instead of a picture. Skips cropping. */
  video?: boolean;
  /** Offer the cropper before uploading. */
  crop?: boolean;
  /**
   * Makes the file input's id unique when `name` is deliberately repeated.
   *
   * The brands editor posts every row under the same `name` so the action can
   * read them with getAll() in document order. Without this the ids would
   * collide and every row's label would open the first row's file picker.
   */
  uid?: string;
}) {
  const [url, setUrl] = useState(defaultValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropping, setCropping] = useState<File | null>(null);
  const [mounted, setMounted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const fieldId = `${name}${uid ? "_" + uid : ""}__file`;

  // The cropper is rendered into <body>, which does not exist during the
  // server render.
  useEffect(() => setMounted(true), []);

  const clearInput = () => {
    // Without this, choosing the same file twice in a row fires no change
    // event and the field appears to ignore the second attempt.
    if (fileRef.current) fileRef.current.value = "";
  };

  async function send(file: File) {
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("alt", label);
    try {
      const result = await uploadOne(fd);
      if (result.error) setError(result.error);
      else if (result.url) setUrl(result.url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      clearInput();
    }
  }

  function choose(file: File | undefined) {
    if (!file) return;
    // Nothing sensible to crop on a video, and the cropper only reads images.
    if (video || !crop || !file.type.startsWith("image/")) void send(file);
    else setCropping(file);
  }

  return (
    <div className="adm-field adm-mf">
      <label htmlFor={fieldId}>{label}</label>

      {/* What the form actually saves. */}
      <input type="hidden" name={name} value={url} />

      <div className="adm-mf__row">
        <div className="adm-mf__thumb" data-empty={url ? undefined : "true"}>
          {url ? (
            video ? (
              <video src={url} muted playsInline preload="metadata" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt="" />
            )
          ) : (
            <span>Nothing yet</span>
          )}
          {busy && <div className="adm-mf__busy">Uploading…</div>}
        </div>

        <div className="adm-mf__side">
          <div className="adm-mf__buttons">
            <button
              type="button"
              className="adm-btn adm-btn--ghost"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              {url ? "Replace" : "Choose file"}
            </button>
            {url && (
              <button
                type="button"
                className="adm-btn adm-btn--ghost"
                disabled={busy}
                onClick={() => {
                  setUrl("");
                  setError(null);
                  clearInput();
                }}
              >
                Remove
              </button>
            )}
          </div>
          {hint && <span className="hint">{hint}</span>}
          {error && <span className="hint adm-mf__err">{error}</span>}
        </div>
      </div>

      <input
        ref={fileRef}
        id={fieldId}
        type="file"
        accept={video ? "video/mp4,video/webm" : "image/*"}
        hidden
        onChange={(e) => choose(e.target.files?.[0])}
      />

      {/* Into <body>, not here. The cropper is a modal, and a modal that lives
          inside the form is both invalid nesting waiting to happen and a change
          to the sibling list React reconciles the form's cards against. */}
      {mounted &&
        cropping &&
        createPortal(
          <ImageCropper
            file={cropping}
            onCancel={() => {
              setCropping(null);
              clearInput();
            }}
            onDone={(cropped) => {
              setCropping(null);
              void send(cropped);
            }}
          />,
          document.body,
        )}
    </div>
  );
}
