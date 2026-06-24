import { FramerDocs } from "@/components/FramerDocs";

export const metadata = {
  title: "Framer · Compify UI",
  description:
    "Insert Compify UI components on the Framer canvas with hosted module URLs. Copy, paste, customize with property controls.",
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
