import { notFound } from "next/navigation";
import { getDbComponent, listDbComponents } from "@/lib/db-components";
import { ComponentWorkspace } from "@/components/ComponentWorkspace";

export async function generateStaticParams() {
  try {
    const all = await listDbComponents();
    return all.map((c) => ({ name: c.entry.name }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: { name: string } }) {
  const data = await getDbComponent(params.name);
  if (!data) return { title: "Component not found · Compify UI" };
  return {
    title: `${data.entry.displayName} · Compify UI`,
    description: data.entry.description,
  };
}

export default async function ComponentPage({ params }: { params: { name: string } }) {
  const data = await getDbComponent(params.name);
  if (!data) notFound();

  return (
    <main className="no-scrollbar relative h-full min-w-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
      <div className="min-h-full bg-bg shadow-[0px_4px_10px_rgba(0,0,0,0.04)]">
        <ComponentWorkspace
          entry={data.entry}
          source={data.source}
          moduleUrl={data.moduleUrl ?? undefined}
        />
      </div>
    </main>
  );
}
