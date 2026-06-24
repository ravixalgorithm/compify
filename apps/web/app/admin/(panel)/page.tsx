import { listDbComponents } from "@/lib/db-components";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const metadata = {
  title: "Admin · Compify UI",
  description: "Manage marketplace components.",
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const entries = (await listDbComponents()).map((c) => c.entry);
  return <AdminDashboard entries={entries} />;
}
