import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import PostForm from "@/components/PostForm";

export const dynamic = "force-dynamic";

export default async function EditPost({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const isNew = id === "new";
  const post = isNew ? null : await db.post.findUnique({ where: { id } });
  if (!isNew && !post) notFound();

  return (
    <>
      <div className="adm__head">
        <div>
          <h1>{isNew ? "New post" : post!.title}</h1>
          <p>Write in plain text — see the formatting note below the box.</p>
        </div>
      </div>
      <PostForm post={post ? JSON.parse(JSON.stringify(post)) : null} />
    </>
  );
}
