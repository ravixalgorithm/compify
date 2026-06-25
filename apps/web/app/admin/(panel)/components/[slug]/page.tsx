import { notFound } from "next/navigation";
import { getDbComponent, listDbComponents } from "@/lib/db-components";
import { categoryOptions } from "@/lib/categories";
import { ComponentForm } from "@/components/admin/ComponentForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const data = await getDbComponent(params.slug);
  return {
    title: data ? `Edit ${data.entry.displayName} · Admin` : "Edit component · Admin",
  };
}

export default async function AdminEditComponentPage({ params }: { params: { slug: string } }) {
  const [data, all] = await Promise.all([
    getDbComponent(params.slug),
    listDbComponents(),
  ]);
  if (!data) notFound();

  return (
    <ComponentForm
      mode="edit"
      initialEntry={data.entry}
      initialSource={data.source}
      categoryOptions={categoryOptions(all.map((c) => c.entry))}
    />
  );
}
