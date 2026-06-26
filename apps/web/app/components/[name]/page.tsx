import { notFound } from "next/navigation";
import { getDbComponent } from "@/lib/db-components";
import { ComponentWorkspace } from "@/components/ComponentWorkspace";

// Always render on demand. db-components reads Supabase with `cache: "no-store"`
// (live reads), which is incompatible with static generation: pairing it with
// `generateStaticParams` made Next try to statically render the page and then
// throw "Page changed from static to dynamic at runtime" → 500 on every
// component page in production. force-dynamic matches the live-reads design.
export const dynamic = "force-dynamic";

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
