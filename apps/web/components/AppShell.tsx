import { CATEGORIES, categoryLabel } from "@compify/shared";
import { listDbComponents } from "@/lib/db-components";
import { Sidebar, type CategoryItem } from "./Sidebar";

// Server shell used by the global not-found page. Reads the component list from
// the DB (same source as the root <AppFrame>) so the 404 sidebar reflects what's
// actually published instead of the static @compify/shared registry, which has
// drifted from the DB after the storage cutover.
export async function AppShell({ children }: { children: React.ReactNode }) {
  const entries = (await listDbComponents()).map((c) => c.entry);

  // Built-in categories first (curated order), then any custom (admin-created)
  // ones alphabetically — mirrors app/layout.tsx so both sidebars agree.
  const counts = new Map<string, number>();
  for (const e of entries) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
  const knownIds = CATEGORIES.map((c) => c.id);
  const customIds = [...counts.keys()]
    .filter((id) => !knownIds.includes(id))
    .sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b)));
  const categories: CategoryItem[] = [...knownIds, ...customIds]
    .filter((id) => (counts.get(id) ?? 0) > 0)
    .map((id) => ({ id, label: categoryLabel(id), count: counts.get(id) ?? 0 }));

  const components = entries.map((e) => ({
    name: e.name,
    displayName: e.displayName,
  }));

  return (
    <div className="flex min-h-screen">
      <Sidebar categories={categories} components={components} total={entries.length} />
      <main className="min-w-0 flex-1 p-1.5">
        <div className="min-h-[calc(100vh-12px)] bg-bg p-6 sm:p-10">{children}</div>
      </main>
    </div>
  );
}
