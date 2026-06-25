import { FramerDocs } from "@/components/FramerDocs";

export const metadata = {
  title: "Framer · Compify UI",
  description:
    "Add Compify UI components to the Framer canvas. Copy any component, paste it as a code component, and customize with property controls.",
};

export default function FramerPage() {
  return (
    <main className="min-w-0 flex-1 p-1.5">
      <div className="min-h-[calc(100vh-12px)] bg-bg p-6 sm:p-10">
        <FramerDocs />
      </div>
    </main>
  );
}
