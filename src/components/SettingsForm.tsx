"use client";

import { useActionState } from "react";
import { saveSettings, type ActionState } from "@/app/admin/actions";
import MediaField from "./MediaField";
import BrandsEditor from "./BrandsEditor";
import type { BrandRow } from "@/lib/models";

type Hours = { day: string; time: string }[];
// Loose shape — the page passes a serialised Settings row.
type S = Record<string, string | string[] | number | null>;

function Field({
  name,
  label,
  defaultValue,
  hint,
  textarea,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  hint?: string;
  textarea?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="adm-field">
      <label htmlFor={name}>{label}</label>
      {textarea ? (
        <textarea id={name} name={name} defaultValue={defaultValue} placeholder={placeholder} />
      ) : (
        <input id={name} name={name} defaultValue={defaultValue} placeholder={placeholder} />
      )}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export default function SettingsForm({
  s,
  hours,
  brands,
}: {
  s: S;
  hours: Hours;
  brands: BrandRow[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveSettings, null);
  const v = (k: string) => String(s[k] ?? "");

  return (
    <form action={action}>
      {state?.error && <div className="adm-err">{state.error}</div>}
      {state?.ok && <div className="adm-note">{state.ok}</div>}

      <div className="adm-card">
        <h2>The cafe</h2>
        <div className="adm-grid">
          <Field name="cafeName" label="Name" defaultValue={v("cafeName")} hint="Also the big hero headline." />
          <Field name="tamilName" label="Tamil name" defaultValue={v("tamilName")} />
          <Field name="tagline" label="Tagline" defaultValue={v("tagline")} />
        </div>
      </div>

      <div className="adm-card">
        <h2>Hero</h2>
        <div className="adm-grid">
          <Field name="heroEyebrow" label="Small label above the name" defaultValue={v("heroEyebrow")} />
          <Field name="heroBadge" label="Open badge" defaultValue={v("heroBadge")} />
          <Field name="heroTrust" label="Line under the buttons" defaultValue={v("heroTrust")} />
          <Field name="heroSide" label="Rotated side label" defaultValue={v("heroSide")} />
        </div>
        <div style={{ marginTop: ".9rem", display: "grid", gap: ".9rem" }}>
          <Field name="heroLine1" label="Hero sentence, line 1" defaultValue={v("heroLine1")} />
          <Field name="heroLine2" label="Hero sentence, line 2" defaultValue={v("heroLine2")} />
        </div>
      </div>

      <div className="adm-card">
        <h2>Pictures — home page</h2>
        <p className="adm-cardnote">
          Choose a file and it uploads straight away, here. Pictures can be
          cropped and turned upright before they go. Nothing changes on the site
          until you press <b>Save changes</b> at the bottom.
        </p>
        <div className="adm-grid">
          <MediaField
            name="heroVideoUrl"
            label="Hero video"
            defaultValue={v("heroVideoUrl")}
            video
            hint="Plays behind the name at the very top. MP4 or WebM."
          />
          <MediaField
            name="heroPosterUrl"
            label="Hero still"
            defaultValue={v("heroPosterUrl")}
            hint="Held on screen while the video loads, and shown instead of it on slow connections."
          />
          <MediaField
            name="storyImage1Url"
            label="Story photo 1"
            defaultValue={v("storyImage1Url")}
            hint="The pair beside the story text, partway down the page."
          />
          <MediaField
            name="storyImage2Url"
            label="Story photo 2"
            defaultValue={v("storyImage2Url")}
          />
        </div>
      </div>

      <div className="adm-card">
        <h2>Pictures — every page</h2>
        <div className="adm-grid">
          <MediaField
            name="logoDarkUrl"
            label="Logo — top bar and footer"
            defaultValue={v("logoDarkUrl")}
            hint="Sits on the dark bar, so it needs to read against a dark background."
          />
          <MediaField
            name="logoUrl"
            label="Logo — browser tab icon"
            defaultValue={v("logoUrl")}
            hint="Square, and small on screen. Simple shapes survive it; fine detail does not."
          />
        </div>
      </div>

      <div className="adm-card">
        <h2>The owner&apos;s note</h2>
        <div className="adm-note" style={{ marginTop: 0 }}>
          This appears on the home page, above the journal link. Leave the note
          empty and the page shows a plain unsigned introduction instead —
          nothing is ever published under a name unless you have written it.
        </div>
        <div className="adm-field" style={{ marginTop: ".9rem" }}>
          <label htmlFor="ownerNote">The note</label>
          <textarea
            id="ownerNote"
            name="ownerNote"
            defaultValue={v("ownerNote")}
            style={{ minHeight: 130 }}
            placeholder="Two or three sentences in your own words — why you opened, what you care about getting right, who the place is for."
          />
          <span className="hint">Your words, not a description. Short reads better than long.</span>
        </div>
        <div className="adm-grid" style={{ marginTop: ".9rem" }}>
          <Field name="ownerName" label="Name" defaultValue={v("ownerName")} hint="Shown under the note. Blank hides it." />
          <Field name="ownerRole" label="Role" defaultValue={v("ownerRole")} placeholder="Owner" />
          <MediaField
            name="ownerPhotoUrl"
            label="Photo"
            defaultValue={v("ownerPhotoUrl")}
            hint="A square photo works best — crop it to square after choosing."
          />
        </div>
      </div>

      <div className="adm-card">
        <h2>Contact</h2>
        <div className="adm-grid">
          <Field name="phone" label="Phone" defaultValue={v("phone")} />
          <Field name="whatsapp" label="WhatsApp number" defaultValue={v("whatsapp")} hint="Digits only, with country code. e.g. 919840000000" />
          <Field name="email" label="Email" defaultValue={v("email")} />
        </div>
        <div className="adm-grid" style={{ marginTop: ".9rem" }}>
          <Field name="addressL1" label="Address line 1" defaultValue={v("addressL1")} />
          <Field name="addressL2" label="Address line 2" defaultValue={v("addressL2")} />
          <Field name="addressL3" label="Address line 3" defaultValue={v("addressL3")} />
        </div>
        <div style={{ marginTop: ".9rem" }}>
          <Field name="mapsQuery" label="Google Maps search text" defaultValue={v("mapsQuery")} hint="What the map pin searches for." />
        </div>
      </div>

      <div className="adm-card">
        <h2>Opening hours</h2>
        <div className="adm-grid">
          {hours.map((h) => (
            <div className="adm-field" key={h.day}>
              <label htmlFor={`hours_${h.day}`}>{h.day}</label>
              <input id={`hours_${h.day}`} name={`hours_${h.day}`} defaultValue={h.time} />
            </div>
          ))}
        </div>
      </div>

      <div className="adm-card">
        <h2>Brands we own</h2>
        <p className="adm-cardnote">
          The strip that scrolls under the About Us section on the home page.
          Logos are matched by height, so a wide wordmark and a square mark sit
          together properly. A brand with no logo yet shows its name set in
          type. The whole strip is hidden while this list is empty.
        </p>
        <BrandsEditor brands={brands} />
      </div>

      <div className="adm-card">
        <h2>Scrolling band</h2>
        <Field
          name="marquee"
          label="One phrase per line"
          textarea
          defaultValue={(Array.isArray(s.marquee) ? s.marquee : []).join("\n")}
          hint="These scroll across the yellow strip on the home page."
        />
      </div>

      <button className="adm-btn" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
