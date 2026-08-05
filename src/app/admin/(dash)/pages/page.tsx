import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const fmt = (d: Date) =>
  d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default async function AdminPages() {
  const pages = await db.page.findMany({ orderBy: { slug: "asc" } });

  return (
    <>
      <div className="adm__head">
        <div>
          <h1>Terms &amp; Privacy</h1>
          <p>The legal pages linked in the footer of every page.</p>
        </div>
      </div>

      <div className="adm-note">
        <b>Worth a read before you launch.</b> These were written to describe how
        this site actually behaves. If you start taking payments online, add
        analytics, or collect email addresses, they will need updating — and it
        is worth having someone qualified check them.
      </div>

      <div className="adm-card">
        <div className="adm-wrapx">
          <table className="adm-table">
            <thead>
              <tr><th>Page</th><th>Address</th><th>Updated</th><th>Status</th></tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.id}>
                  <td><Link href={`/admin/pages/${p.id}`}><b>{p.title}</b></Link></td>
                  <td style={{ color: "var(--cream-dim)" }}>/{p.slug}</td>
                  <td style={{ color: "var(--cream-dim)" }}>{fmt(p.updatedAt)}</td>
                  <td>
                    <span className={`adm-tag ${p.published ? "adm-tag--on" : "adm-tag--off"}`}>
                      {p.published ? "Live" : "Hidden"}
                    </span>
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
