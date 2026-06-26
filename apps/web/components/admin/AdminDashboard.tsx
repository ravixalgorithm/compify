"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { categoryLabel, type RegistryEntry } from "@compify/shared";
import { GalleryCardMedia } from "@/components/GalleryCardMedia";

export function AdminDashboard({ entries }: { entries: RegistryEntry[] }) {
  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-white">Components</h1>
          <p className="mt-1 text-[14px] text-muted">
            {entries.length} published — click any card to edit details, files, or thumbnail.
          </p>
        </div>
        <Link
          href="/admin/components/new"
          className="flex h-10 items-center gap-2 bg-white px-4 text-[14px] font-medium text-black transition hover:bg-white/90"
        >
          <Plus size={16} />
          Add component
        </Link>
      </div>

      <div className="grid grid-cols-1 items-start gap-[14px] sm:grid-cols-2 xl:grid-cols-3">
        {entries.map((entry) => (
          // Link is an absolute overlay (not a wrapper) so the live preview is
          // never rendered inside an <a> — a previewed component can render its
          // own anchor, and <a> inside <a> is invalid HTML (hydration error).
          <div
            key={entry.name}
            className="group relative flex h-fit w-full flex-col overflow-hidden border border-stroke bg-surface transition hover:border-stroke-hover"
          >
            {/* Actual gallery media (uploaded image/video) or the live preview —
                the same thing the marketplace card shows. */}
            <div className="w-full overflow-hidden bg-bg">
              <GalleryCardMedia entry={entry} alt={`${entry.displayName} preview`} />
            </div>
            <div className="space-y-1 p-4">
              <p className="text-[15px] text-white">{entry.displayName}</p>
              <p className="line-clamp-2 text-[12px] text-muted">{entry.description}</p>
              <p className="text-[11px] text-muted-foreground">{categoryLabel(entry.category)}</p>
            </div>
            <Link
              href={`/admin/components/${entry.name}`}
              aria-label={`Edit ${entry.displayName}`}
              className="absolute inset-0 z-10"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
