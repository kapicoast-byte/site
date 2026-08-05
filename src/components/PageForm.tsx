"use client";

import Link from "next/link";
import { useActionState } from "react";
import { savePage, type ActionState } from "@/app/admin/actions";

type Block = { t: "p" | "h" | "q"; c: string } | { t: "ul"; c: string[] };
type Page = {
  id: string;
  slug: string;
  title: string;
  intro: string;
  published: boolean;
  body: Block[];
};

/** Stored blocks back into the plain text the textarea edits. */
function toText(body: Block[]): string {
  return body
    .map((b) => {
      if (b.t === "h") return `## ${b.c}`;
      if (b.t === "ul") return b.c.map((li) => `- ${li}`).join("\n");
      return b.c;
    })
    .join("\n\n");
}

export default function PageForm({ page }: { page: Page }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(savePage, null);

  return (
    <form action={action}>
      {state?.error && <div className="adm-err">{state.error}</div>}
      {state?.ok && <div className="adm-note">{state.ok}</div>}
      <input type="hidden" name="id" value={page.id} />

      <div className="adm-card">
        <h2>Heading</h2>
        <div className="adm-field">
          <label htmlFor="title">Title</label>
          <input id="title" name="title" defaultValue={page.title} required />
        </div>
        <div className="adm-field" style={{ marginTop: ".9rem" }}>
          <label htmlFor="intro">Standfirst</label>
          <textarea id="intro" name="intro" defaultValue={page.intro} />
          <span className="hint">The line under the title. Keep it to a sentence.</span>
        </div>
        <label style={{ display: "flex", gap: ".4rem", alignItems: "center", fontSize: ".9rem", marginTop: "1rem" }}>
          <input type="checkbox" name="published" defaultChecked={page.published} />
          Show this page on the site
        </label>
      </div>

      <div className="adm-card">
        <h2>Body</h2>
        <div className="adm-field">
          <label htmlFor="body">Text</label>
          <textarea
            id="body"
            name="body"
            defaultValue={toText(page.body)}
            style={{ minHeight: 560, lineHeight: 1.65 }}
          />
        </div>
        <div className="adm-note" style={{ marginTop: ".9rem", marginBottom: 0 }}>
          <b>Formatting</b>
          <br />
          Leave a blank line between paragraphs. Start a line with <code>## </code>
          for a section heading, or <code>- </code> for a bullet point.
          <br />
          <br />
          The &ldquo;Last updated&rdquo; date on the public page changes automatically
          whenever you save.
        </div>
      </div>

      <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
        <button className="adm-btn" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save page"}
        </button>
        <Link className="adm-btn adm-btn--ghost" href="/admin/pages">Back</Link>
      </div>
    </form>
  );
}
