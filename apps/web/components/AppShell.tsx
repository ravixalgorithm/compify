import { registry, CATEGORIES } from "@compify/shared";
import { Sidebar, type CategoryItem } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const categories: CategoryItem[] = CATEGORIES.map((c) => ({
    id: c.id,
    label: c.label,
    count: registry.filter((e) => e.category === c.id).length,
  })).filter((c) => c.count > 0);

  const components = registry.map((e) => ({
    name: e.name,
    displayName: e.displayName,
  }));

  return (
    <div className="flex min-h-screen">
      <Sidebar categories={categories} components={components} total={registry.length} />
      <main className="min-w-0 flex-1 p-1.5">
        <div className="min-h-[calc(100vh-12px)] bg-bg p-6 sm:p-10">{children}</div>
      </main>
    </div>
  );
}
