import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import MenuItemForm from "@/components/MenuItemForm";

export const dynamic = "force-dynamic";

export default async function EditMenuItem({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const isNew = id === "new";

  const [item, categories] = await Promise.all([
    isNew ? null : db.menuItem.findUnique({ where: { id } }),
    db.category.findMany({ orderBy: { order: "asc" } }),
  ]);

  if (!isNew && !item) notFound();

  return (
    <>
      <div className="adm__head">
        <div>
          <h1>{isNew ? "New dish" : item!.name}</h1>
          <p>{isNew ? "Add something to the menu." : "Edit this dish and its recipe."}</p>
        </div>
      </div>

      <MenuItemForm
        item={item ? JSON.parse(JSON.stringify(item)) : null}
        categories={categories.map((c) => ({ id: c.id, label: c.label }))}
      />
    </>
  );
}
