"use client";

import type { RegistryEntry } from "@compify/shared";
import { ViewIntentLink } from "./ViewIntentLink";
import { GalleryCardCorners } from "./GalleryCardCorners";
import { GalleryInlinePreview } from "./GalleryInlinePreview";

function ShowcaseCell({ entry }: { entry: RegistryEntry }) {
  return (
    <div className="group relative aspect-[16/9] w-full min-w-0 overflow-hidden bg-[#0e0d12] lg:flex-1">
      {/* Uniform 16:9 box. The preview fills the width and is centered vertically,
          so taller components (e.g. repeat-image-hover) crop from the middle and
          keep their subject in view instead of being cut off or shrunk. */}
      <div className="absolute inset-0 flex items-center">
        <GalleryInlinePreview entry={entry} surface="gallery" />
      </div>
      <GalleryCardCorners />
      <ViewIntentLink
        slug={entry.name}
        href={`/components/${entry.name}`}
        aria-label={`View ${entry.displayName}`}
        className="absolute inset-0 z-20 transition hover:brightness-110"
      />
    </div>
  );
}

export function IntroShowcase({ entries }: { entries: RegistryEntry[] }) {
  if (entries.length === 0) return null;

  const rows = [entries.slice(0, 2), entries.slice(2, 4)];

  return (
    <div className="flex w-full flex-col gap-3.5">
      {rows.map((row, index) =>
        row.length > 0 ? (
          <div key={index} className="flex flex-col gap-3.5 lg:flex-row">
            {row.map((entry) => (
              <ShowcaseCell key={entry.name} entry={entry} />
            ))}
          </div>
        ) : null,
      )}
    </div>
  );
}
