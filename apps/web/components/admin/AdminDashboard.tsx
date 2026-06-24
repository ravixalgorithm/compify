"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import type { RegistryEntry } from "@compify/shared";
import { componentThumbnail } from "@/lib/thumbnails";

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {entries.map((entry) => (
          <Link
            key={entry.name}
            href={`/admin/components/${entry.name}`}
            className="group border border-stroke bg-surface transition hover:border-stroke-hover"
          >
            <div
              className="aspect-[4/3] w-full"
              style={{
                background: `linear-gradient(135deg, ${entry.previewAccent}33, #111 70%)`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={componentThumbnail(entry)}
                alt=""
                className="size-full object-cover opacity-80 transition group-hover:opacity-100"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
            <div className="space-y-1 p-4">
              <p className="text-[15px] text-white">{entry.displayName}</p>
              <p className="line-clamp-2 text-[12px] text-muted">{entry.description}</p>
              <p className="text-[11px] capitalize text-muted-foreground">{entry.category}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
