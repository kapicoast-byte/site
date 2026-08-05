"use client";

import { useActionState } from "react";
import { saveSettings, type ActionState } from "@/app/admin/actions";

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

export default function SettingsForm({ s, hours }: { s: S; hours: Hours }) {
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
        <h2>Pictures &amp; video</h2>
        <p style={{ fontSize: ".84rem", color: "var(--cream-dim)", marginBottom: "1rem" }}>
          Upload files under <b>Images &amp; video</b>, press “Copy link”, then paste the
          link into any box below.
        </p>
        <div className="adm-grid">
          <Field name="logoDarkUrl" label="Logo (nav + footer)" defaultValue={v("logoDarkUrl")} hint="Shows on the dark bar." />
          <Field name="logoUrl" label="Logo (favicon)" defaultValue={v("logoUrl")} />
          <Field name="heroVideoUrl" label="Hero video" defaultValue={v("heroVideoUrl")} hint="MP4 or WebM." />
          <Field name="heroPosterUrl" label="Hero still image" defaultValue={v("heroPosterUrl")} hint="Shown before the video plays." />
          <Field name="storyImage1Url" label="Story photo 1" defaultValue={v("storyImage1Url")} />
          <Field name="storyImage2Url" label="Story photo 2" defaultValue={v("storyImage2Url")} />
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
          <Field
            name="ownerPhotoUrl"
            label="Photo"
            defaultValue={v("ownerPhotoUrl")}
            hint="Upload under Images & video, then paste its address here. A square photo works best."
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
