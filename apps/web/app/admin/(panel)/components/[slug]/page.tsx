import { notFound } from "next/navigation";
import { getDbComponent } from "@/lib/db-components";
import { ComponentForm } from "@/components/admin/ComponentForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const data = await getDbComponent(params.slug);
  return {
    title: data ? `Edit ${data.entry.displayName} · Admin` : "Edit component · Admin",
  };
}

export default async function AdminEditComponentPage({ params }: { params: { slug: string } }) {
  const data = await getDbComponent(params.slug);
  if (!data) notFound();

  return <ComponentForm mode="edit" initialEntry={data.entry} initialSource={data.source} />;
}
