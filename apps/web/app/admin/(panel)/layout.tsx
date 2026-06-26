import { listDbComponents } from "@/lib/db-components";
import { AdminShell } from "@/components/admin/AdminShell";

// Access control lives in the parent server layout (app/admin/layout.tsx), which
// requires a Supabase session with app_metadata.is_admin and redirects everyone
// else home. No separate password gate.
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const components = (await listDbComponents())
    .map((c) => ({ name: c.entry.name, displayName: c.entry.displayName }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  return <AdminShell components={components}>{children}</AdminShell>;
}
