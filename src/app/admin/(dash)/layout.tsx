import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { logoutAction } from "../actions";
import AdminNav from "@/components/AdminNav";

export default async function DashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();

  return (
    <div className="adm">
      <aside className="adm__side">
        <Link className="adm__brand" href="/admin">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo-nav.png" alt="" />
          <span>
            <b>Kapi Coast</b>
            <small>Admin</small>
          </span>
        </Link>

        <AdminNav />

        <div className="adm__spacer" />

        <p style={{ fontSize: ".72rem", color: "var(--cream-dim)", padding: "0 .7rem .6rem" }}>
          {session.email}
        </p>
        <Link
          href="/"
          target="_blank"
          className="adm-btn adm-btn--ghost"
          style={{ marginBottom: ".5rem" }}
        >
          View site ↗
        </Link>
        <form action={logoutAction}>
          <button className="adm-btn adm-btn--ghost" type="submit" style={{ width: "100%" }}>
            Sign out
          </button>
        </form>
      </aside>

      <main className="adm__main">{children}</main>
    </div>
  );
}
