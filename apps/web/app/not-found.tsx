import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export default function NotFound() {
  return (
    <AppShell>
      <div className="flex flex-col items-start gap-4 py-32">
        <p className="text-2xs tracking-tighter text-muted">404</p>
        <p className="text-sm tracking-tighter text-muted">Component not found.</p>
        <Link href="/" className="ui-btn-primary px-4">
          Back to gallery
        </Link>
      </div>
    </AppShell>
  );
}
