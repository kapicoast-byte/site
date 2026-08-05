"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { saveMenuItem, type ActionState } from "@/app/admin/actions";
import ImageCropper from "./ImageCropper";

type Ingredient = { amt: string; txt: string };
type Item = {
  id: string;
  slug: string;
  name: string;
  tamil: string;
  price: number;
  blurb: string;
  accent: string;
  imageUrl: string | null;
  tags: string[];
  published: boolean;
  order: number;
  time: string;
  serves: string;
  level: string;
  note: string;
  ingredients: Ingredient[];
  steps: string[];
  categoryId: string;
} | null;

const TAGS = [
  { key: "veg", label: "Veg" },
  { key: "hot", label: "Spice-forward" },
  { key: "star", label: "Counter favourite" },
];

export default function MenuItemForm({
  item,
  categories,
}: {
  item: Item;
  categories: { id: string; label: string }[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveMenuItem, null);

  // Photo state: `picked` is a local preview of a newly chosen file,
  // `removed` means clear the existing one on save.
  const fileRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const shownPhoto = picked ?? (removed ? null : item?.imageUrl ?? null);

  // Cropping. `cropping` is the file open in the cropper; `original` is kept so
  // "Crop again" re-crops the photo as chosen rather than the already-cropped
  // copy, which would compound the quality loss each time.
  const [cropping, setCropping] = useState<File | null>(null);
  const [original, setOriginal] = useState<File | null>(null);

  /** Put the finished file back on the input so the form posts it as normal. */
  const useCropped = (f: File) => {
    const dt = new DataTransfer();
    dt.items.add(f);
    if (fileRef.current) fileRef.current.files = dt.files;
    setPicked(URL.createObjectURL(f));
    setRemoved(false);
    setCropping(null);
  };

  const cancelCrop = () => {
    setCropping(null);
    // Nothing chosen yet, so leave the input empty rather than holding a file
    // the owner never confirmed.
    if (!picked && fileRef.current) fileRef.current.value = "";
  };

  // Object URLs hold a reference to the file until revoked.
  useEffect(() => {
    return () => {
      if (picked) URL.revokeObjectURL(picked);
    };
  }, [picked]);

  const ingredientText = (item?.ingredients ?? [])
    .map((i) => `${i.amt} | ${i.txt}`)
    .join("\n");

  return (
    <>
      {/* Outside the form on purpose. It is a modal, and adding or removing an
          element at the top of the form changes the sibling list React matches
          against — which is exactly how the cards below can get crossed. */}
      {cropping && (
        <ImageCropper file={cropping} onCancel={cancelCrop} onDone={useCropped} />
      )}

    <form action={action}>
      {state?.error && <div className="adm-err">{state.error}</div>}
      {item && <input type="hidden" name="id" value={item.id} />}

      {/* Every section below is keyed. These inputs are uncontrolled — the DOM
          holds the value, defaultValue only seeds it — so if React ever pairs
          one card's nodes with another's it keeps the typed values and swaps
          the name attributes, silently writing the recipe's fields into the
          dish's. Stable keys make that impossible. */}
      <div className="adm-card" key="dish">
        <h2>The dish</h2>
        <div className="adm-grid">
          <div className="adm-field">
            <label htmlFor="name">Name</label>
            <input id="name" name="name" defaultValue={item?.name ?? ""} required />
          </div>
          <div className="adm-field">
            <label htmlFor="tamil">Tamil name</label>
            <input id="tamil" name="tamil" defaultValue={item?.tamil ?? ""} />
          </div>
          <div className="adm-field">
            <label htmlFor="price">Price (₹)</label>
            <input id="price" name="price" type="number" min={0} defaultValue={item?.price ?? 0} required />
          </div>
          <div className="adm-field">
            <label htmlFor="categoryId">Category</label>
            <select id="categoryId" name="categoryId" defaultValue={item?.categoryId ?? categories[0]?.id}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="adm-field">
            <label htmlFor="slug">Web address</label>
            <input id="slug" name="slug" defaultValue={item?.slug ?? ""} placeholder="filled in automatically" />
            <span className="hint">Leave blank and we&apos;ll make one from the name.</span>
          </div>
          <div className="adm-field">
            <label htmlFor="order">Sort order</label>
            <input id="order" name="order" type="number" defaultValue={item?.order ?? 0} />
          </div>
        </div>

        <div className="adm-field" style={{ marginTop: ".9rem" }}>
          <label htmlFor="blurb">Short description</label>
          <textarea id="blurb" name="blurb" defaultValue={item?.blurb ?? ""} />
        </div>

        <div className="adm-grid" style={{ marginTop: ".9rem" }}>
          <div className="adm-field">
            <label htmlFor="photoFile">Dish photo</label>

            {/* Carries the existing photo through a save when no new file is
                chosen. Replaced by the upload, or cleared by "Remove". */}
            <input type="hidden" name="imageUrl" value={item?.imageUrl ?? ""} />

            {shownPhoto ? (
              <div className="adm-photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shownPhoto} alt="" />
                <div>
                  <button
                    type="button"
                    className="adm-btn adm-btn--ghost"
                    onClick={() => {
                      setPicked(null);
                      setRemoved(true);
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                  >
                    Remove photo
                  </button>
                  {original && (
                    <button
                      type="button"
                      className="adm-btn adm-btn--ghost"
                      style={{ marginLeft: ".4rem" }}
                      onClick={() => setCropping(original)}
                    >
                      Crop again
                    </button>
                  )}
                  <span className="hint">
                    {picked ? "New photo — save to keep it." : "Currently on the site."}
                  </span>
                </div>
              </div>
            ) : (
              <p className="hint" style={{ marginBottom: ".4rem" }}>
                No photo. The dish shows a coloured card with its name instead.
              </p>
            )}

            <input
              ref={fileRef}
              id="photoFile"
              name="photoFile"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) { setPicked(null); return; }
                setOriginal(f);
                setCropping(f);
              }}
            />
            {removed && <input type="hidden" name="removePhoto" value="true" />}
            <span className="hint">
              JPG, PNG or WebP. You can crop it after choosing. Uploaded when you save.
            </span>
          </div>

          <div className="adm-field">
            <label htmlFor="accent">Card colour</label>
            <input id="accent" name="accent" type="color" defaultValue={item?.accent ?? "#6B4226"} style={{ height: 42, padding: 4 }} />
            <span className="hint">Used when there&apos;s no photo.</span>
          </div>
        </div>

        <fieldset style={{ border: 0, marginTop: "1rem" }}>
          <legend style={{ fontSize: ".72rem", letterSpacing: ".12em", textTransform: "uppercase", color: "var(--cream-dim)", fontWeight: 700, marginBottom: ".5rem" }}>
            Labels
          </legend>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            {TAGS.map((t) => (
              <label key={t.key} style={{ display: "flex", gap: ".4rem", alignItems: "center", fontSize: ".9rem" }}>
                <input type="checkbox" name="tags" value={t.key} defaultChecked={item?.tags.includes(t.key)} />
                {t.label}
              </label>
            ))}
            <label style={{ display: "flex", gap: ".4rem", alignItems: "center", fontSize: ".9rem", marginLeft: "auto" }}>
              <input type="checkbox" name="published" defaultChecked={item ? item.published : true} />
              Show on the site
            </label>
          </div>
        </fieldset>
      </div>

      <div className="adm-card" key="recipe">
        <h2>The recipe</h2>
        <div className="adm-grid">
          <div className="adm-field">
            <label htmlFor="time">Time</label>
            <input id="time" name="time" defaultValue={item?.time ?? ""} placeholder="15 min" />
          </div>
          <div className="adm-field">
            <label htmlFor="serves">Makes</label>
            <input id="serves" name="serves" defaultValue={item?.serves ?? ""} placeholder="2 glasses" />
          </div>
          <div className="adm-field">
            <label htmlFor="level">Effort</label>
            <input id="level" name="level" defaultValue={item?.level ?? ""} placeholder="Easy" />
          </div>
        </div>

        <div className="adm-field" style={{ marginTop: ".9rem" }}>
          <label htmlFor="ingredients">Ingredients</label>
          <textarea
            id="ingredients"
            name="ingredients"
            defaultValue={ingredientText}
            style={{ minHeight: 160 }}
            placeholder={"2 tbsp | filter coffee powder\n150 ml | full-cream milk"}
          />
          <span className="hint">One per line, as <b>amount | ingredient</b>.</span>
        </div>

        <div className="adm-field" style={{ marginTop: ".9rem" }}>
          <label htmlFor="steps">Method</label>
          <textarea
            id="steps"
            name="steps"
            defaultValue={(item?.steps ?? []).join("\n")}
            style={{ minHeight: 180 }}
          />
          <span className="hint">One step per line. They&apos;re numbered automatically.</span>
        </div>

        <div className="adm-field" style={{ marginTop: ".9rem" }}>
          <label htmlFor="note">Note from the counter</label>
          <textarea id="note" name="note" defaultValue={item?.note ?? ""} />
        </div>
      </div>

      <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }} key="actions">
        <button className="adm-btn" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save dish"}
        </button>
        <Link className="adm-btn adm-btn--ghost" href="/admin/menu">Cancel</Link>
      </div>
    </form>
    </>
  );
}
