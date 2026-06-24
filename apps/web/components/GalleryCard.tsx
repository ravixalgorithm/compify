import Link from "next/link";
import type { RegistryEntry } from "@compify/shared";
import { GalleryCardFrame } from "./GalleryCardFrame";
import { GalleryCardMedia } from "./GalleryCardMedia";

export function GalleryCard({
  entry,
  priority = false,
}: {
  entry: RegistryEntry;
  priority?: boolean;
}) {
  return (
    <Link
      href={`/components/${entry.name}`}
      className="mb-[14px] block w-full shrink-0 break-inside-avoid"
    >
      <GalleryCardFrame>
        <GalleryCardMedia
          entry={entry}
          alt={`${entry.displayName} thumbnail`}
          priority={priority}
        />
      </GalleryCardFrame>
    </Link>
  );
}
