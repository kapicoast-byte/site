import Link from "next/link";
import { db } from "@/lib/db";
import AdminMenuTable from "@/components/AdminMenuTable";

export const dynamic = "force-dynamic";

export default async function AdminMenu() {
  const items = await db.menuItem.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: { category: true },
  });

  return (
    <>
      <div className="adm__head">
        <div>
          <h1>Menu &amp; recipes</h1>
          <p>Click a dish to edit its price, description, photo or recipe.</p>
        </div>
        <Link className="adm-btn" href="/admin/menu/new">+ New dish</Link>
      </div>

      {/* Only the fields the table shows — no point shipping every recipe step
          to the browser just to render a list. */}
      <AdminMenuTable
        items={items.map((m) => ({
          id: m.id,
          name: m.name,
          tamil: m.tamil,
          imageUrl: m.imageUrl,
          accent: m.accent,
          price: m.price,
          published: m.published,
          category: m.category.label,
        }))}
      />
    </>
  );
}
