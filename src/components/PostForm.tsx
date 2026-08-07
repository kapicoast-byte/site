"use client";

import Link from "next/link";
import { useActionState } from "react";
import { savePost, type ActionState } from "@/app/admin/actions";
import MediaField from "./MediaField";

type Block = { t: "p" | "h" | "q"; c: string } | { t: "ul"; c: string[] };
type Post = {
  id: string;
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  imageUrl: string | null;
  readMins: number;
  published: boolean;
  body: Block[];
} | null;

/** Turn stored blocks back into the plain-text format the textarea uses. */
function toText(body: Block[]): string {
  return body
    .map((b) => {
      if (b.t === "h") return `## ${b.c}`;
      if (b.t === "q") return `> ${b.c}`;
      if (b.t === "ul") return b.c.map((li) => `- ${li}`).join("\n");
      return b.c;
    })
    .join("\n\n");
}

export default function PostForm({ post }: { post: Post }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(savePost, null);

  return (
    <form action={action}>
      {state?.error && <div className="adm-err">{state.error}</div>}
      {post && <input type="hidden" name="id" value={post.id} />}

      <div className="adm-card">
        <h2>The post</h2>
        <div className="adm-grid">
          <div className="adm-field">
            <label htmlFor="title">Title</label>
            <input id="title" name="title" defaultValue={post?.title ?? ""} required />
          </div>
          <div className="adm-field">
            <label htmlFor="category">Category</label>
            <input id="category" name="category" defaultValue={post?.category ?? "Notes"} />
          </div>
          <div className="adm-field">
            <label htmlFor="readMins">Reading time (minutes)</label>
            <input id="readMins" name="readMins" type="number" min={1} defaultValue={post?.readMins ?? 4} />
          </div>
          <div className="adm-field">
            <label htmlFor="slug">Web address</label>
            <input id="slug" name="slug" defaultValue={post?.slug ?? ""} placeholder="filled in automatically" />
          </div>
        </div>

        <div className="adm-field" style={{ marginTop: ".9rem" }}>
          <label htmlFor="excerpt">Summary</label>
          <textarea id="excerpt" name="excerpt" defaultValue={post?.excerpt ?? ""} />
          <span className="hint">Shown on the journal cards and in search results.</span>
        </div>

        <div style={{ marginTop: ".9rem" }}>
          <MediaField
            name="imageUrl"
            label="Header picture"
            defaultValue={post?.imageUrl ?? ""}
            hint="Runs across the top of the post and on its card in the journal list. Wide crops suit both."
          />
        </div>

        <label style={{ display: "flex", gap: ".4rem", alignItems: "center", fontSize: ".9rem", marginTop: "1rem" }}>
          <input type="checkbox" name="published" defaultChecked={post ? post.published : true} />
          Publish on the site
        </label>
      </div>

      <div className="adm-card">
        <h2>Body</h2>
        <div className="adm-field">
          <label htmlFor="body">Text</label>
          <textarea
            id="body"
            name="body"
            defaultValue={post ? toText(post.body) : ""}
            style={{ minHeight: 380, lineHeight: 1.6 }}
          />
        </div>
        <div className="adm-note" style={{ marginTop: ".9rem", marginBottom: 0 }}>
          <b>Formatting</b>
          <br />
          Blank line between paragraphs. Start a line with{" "}
          <code>## </code> for a heading, <code>&gt; </code> for a pull quote, or{" "}
          <code>- </code> for a bullet.
        </div>
      </div>

      <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
        <button className="adm-btn" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save post"}
        </button>
        <Link className="adm-btn adm-btn--ghost" href="/admin/journal">Cancel</Link>
      </div>
    </form>
  );
}
