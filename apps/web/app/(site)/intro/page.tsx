import { listDbComponents } from "@/lib/db-components";
import { Introduction } from "@/components/Introduction";

export const metadata = {
  title: "Introduction · Compify UI",
  description:
    "Learn about Compify UI — production-ready components for React and Framer, with MCP delivery and hosted Framer module URLs.",
};

export default async function IntroPage() {
  const entries = (await listDbComponents()).map((c) => c.entry);
  return (
    <main className="relative min-w-0 flex-1 p-1.5">
      <Introduction entries={entries} />
    </main>
  );
}
