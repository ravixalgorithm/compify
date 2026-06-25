import type { RegistryEntry } from "@compify/shared";
import { ViewIntentLink } from "./ViewIntentLink";
import { GalleryCardFrame } from "./GalleryCardFrame";
import { GalleryCardMedia } from "./GalleryCardMedia";
import { AdminPinButton } from "./AdminPinButton";

export function GalleryCard({
  entry,
  priority = false,
  pinnable = false,
  column = 0,
}: {
  entry: RegistryEntry;
  priority?: boolean;
  /** Show the admin "move to top" control (default home grid only). */
  pinnable?: boolean;
  /** The grid column this card is rendered in (for "move to top of column"). */
  column?: number;
}) {
  return (
    <ViewIntentLink
      slug={entry.name}
      href={`/components/${entry.name}`}
      className="relative mb-[14px] block w-full shrink-0 break-inside-avoid"
    >
      {pinnable ? <AdminPinButton slug={entry.name} column={column} /> : null}
      <GalleryCardFrame>
        <GalleryCardMedia
          entry={entry}
          alt={`${entry.displayName} thumbnail`}
          priority={priority}
        />
      </GalleryCardFrame>
    </ViewIntentLink>
  );
}
