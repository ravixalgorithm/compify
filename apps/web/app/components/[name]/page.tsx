import { notFound } from "next/navigation";
import { getComponent, registry } from "@compify/shared";
import { readSource } from "@/lib/source";
import { ComponentWorkspace } from "@/components/ComponentWorkspace";

export function generateStaticParams() {
  return registry.map((c) => ({ name: c.name }));
}

export function generateMetadata({ params }: { params: { name: string } }) {
  const entry = getComponent(params.name);
  if (!entry) return { title: "Component not found · Compify UI" };
  return {
    title: `${entry.displayName} · Compify UI`,
    description: entry.description,
  };
}

export default function ComponentPage({ params }: { params: { name: string } }) {
  const entry = getComponent(params.name);
  if (!entry) notFound();

  const source = readSource(entry);

  return (
    <main className="no-scrollbar relative h-full min-w-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
      <div className="min-h-full bg-bg shadow-[0px_4px_10px_rgba(0,0,0,0.04)]">
        <ComponentWorkspace entry={entry} source={source} />
      </div>
    </main>
  );
}
