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
  // The navigation link is an absolute overlay sibling (not a wrapper) so the
  // live component preview is never rendered inside an <a>. A previewed
  // component can render its own anchor/button, and <a> inside <a> is invalid
  // HTML (hydration error). The preview is non-interactive; the overlay on top
  // captures the click. (Same pattern as IntroShowcase.)
  return (
    <div className="relative mb-[14px] block w-full shrink-0 break-inside-avoid">
      {pinnable ? <AdminPinButton slug={entry.name} column={column} /> : null}
      <GalleryCardFrame>
        <GalleryCardMedia
          entry={entry}
          alt={`${entry.displayName} thumbnail`}
          priority={priority}
        />
      </GalleryCardFrame>
      <ViewIntentLink
        slug={entry.name}
        href={`/components/${entry.name}`}
        aria-label={`View ${entry.displayName}`}
        className="absolute inset-0 z-10"
      />
    </div>
  );
}
