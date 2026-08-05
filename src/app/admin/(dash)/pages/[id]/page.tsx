import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import PageForm from "@/components/PageForm";

export const dynamic = "force-dynamic";

export default async function EditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const page = await db.page.findUnique({ where: { id } });
  if (!page) notFound();

  return (
    <>
      <div className="adm__head">
        <div>
          <h1>{page.title}</h1>
          <p>Shown to visitors at /{page.slug}</p>
        </div>
        <a className="adm-btn adm-btn--ghost" href={`/${page.slug}`} target="_blank" rel="noopener">
          View page ↗
        </a>
      </div>
      <PageForm page={JSON.parse(JSON.stringify(page))} />
    </>
  );
}
