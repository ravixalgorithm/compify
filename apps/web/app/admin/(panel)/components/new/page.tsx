import { listDbComponents } from "@/lib/db-components";
import { categoryOptions } from "@/lib/categories";
import { ComponentForm } from "@/components/admin/ComponentForm";

export const metadata = {
  title: "Add component · Admin · Compify UI",
};

export const dynamic = "force-dynamic";

export default async function AdminNewComponentPage() {
  const entries = (await listDbComponents()).map((c) => c.entry);
  return <ComponentForm mode="create" categoryOptions={categoryOptions(entries)} />;
}
