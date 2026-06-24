import { notFound } from "next/navigation";
import { getDbComponent } from "@/lib/db-components";
import { ComponentWorkspace } from "@/components/ComponentWorkspace";

// Parity route: renders a component entirely from the DB (metadata + source +
// runtime-compiled module) using the same workspace UI as /components/[name].
// Used to confirm the DB render path matches the bundled render before cutover.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }) {
  const data = await getDbComponent(params.name);
  if (!data) return { title: "Component not found · Compify UI" };
  return { title: `${data.entry.displayName} (DB) · Compify UI`, description: data.entry.description };
}

export default async function DbComponentPage({ params }: { params: { name: string } }) {
  const data = await getDbComponent(params.name);
  if (!data) notFound();

  return (
    <main className="no-scrollbar relative h-full min-w-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
      <div className="min-h-full bg-bg shadow-[0px_4px_10px_rgba(0,0,0,0.04)]">
        <ComponentWorkspace entry={data.entry} source={data.source} moduleUrl={data.moduleUrl ?? undefined} />
      </div>
    </main>
  );
}
