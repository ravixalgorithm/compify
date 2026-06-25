import { listDbComponents } from "@/lib/db-components";
import { AdminGate } from "@/components/admin/AdminGate";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const components = (await listDbComponents())
    .map((c) => ({ name: c.entry.name, displayName: c.entry.displayName }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  return (
    <AdminGate>
      <AdminShell components={components}>{children}</AdminShell>
    </AdminGate>
  );
}
