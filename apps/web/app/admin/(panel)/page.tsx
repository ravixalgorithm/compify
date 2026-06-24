import { registry } from "@compify/shared";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const metadata = {
  title: "Admin · Compify UI",
  description: "Manage marketplace components.",
};

export default function AdminPage() {
  return <AdminDashboard entries={registry} />;
}
