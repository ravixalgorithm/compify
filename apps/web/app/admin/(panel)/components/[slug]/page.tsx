import { notFound } from "next/navigation";
import { getComponent } from "@compify/shared";
import { ComponentForm } from "@/components/admin/ComponentForm";
import { readSource } from "@/lib/source";

export function generateMetadata({ params }: { params: { slug: string } }) {
  const entry = getComponent(params.slug);
  return {
    title: entry ? `Edit ${entry.displayName} · Admin` : "Edit component · Admin",
  };
}

export default function AdminEditComponentPage({ params }: { params: { slug: string } }) {
  const entry = getComponent(params.slug);
  if (!entry) notFound();

  const source = readSource(entry);

  return <ComponentForm mode="edit" initialEntry={entry} initialSource={source} />;
}
