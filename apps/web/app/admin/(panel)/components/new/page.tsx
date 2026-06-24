import { ComponentForm } from "@/components/admin/ComponentForm";

export const metadata = {
  title: "Add component · Admin · Compify UI",
};

export default function AdminNewComponentPage() {
  return <ComponentForm mode="create" />;
}
