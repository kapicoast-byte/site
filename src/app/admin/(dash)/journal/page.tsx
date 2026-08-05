import Link from "next/link";
import { db } from "@/lib/db";
import { deletePost } from "../../actions";

export const dynamic = "force-dynamic";

const fmt = (d: Date) =>
  d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default async function AdminJournal() {
  const posts = await db.post.findMany({ orderBy: { publishedAt: "desc" } });

  return (
    <>
      <div className="adm__head">
        <div>
          <h1>Journal</h1>
          <p>{posts.length} posts.</p>
        </div>
        <Link className="adm-btn" href="/admin/journal/new">+ New post</Link>
      </div>

      <div className="adm-card">
        <div className="adm-wrapx">
          <table className="adm-table">
            <thead>
              <tr><th>Title</th><th>Category</th><th>Date</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <td><Link href={`/admin/journal/${p.id}`}><b>{p.title}</b></Link></td>
                  <td style={{ color: "var(--cream-dim)" }}>{p.category}</td>
                  <td style={{ color: "var(--cream-dim)" }}>{fmt(p.publishedAt)}</td>
                  <td>
                    <span className={`adm-tag ${p.published ? "adm-tag--on" : "adm-tag--off"}`}>
                      {p.published ? "Live" : "Draft"}
                    </span>
                  </td>
                  <td className="num">
                    <form action={deletePost}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="adm-btn adm-btn--ghost" type="submit" style={{ padding: ".35rem .7rem", minHeight: 0, fontSize: ".72rem" }}>
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
