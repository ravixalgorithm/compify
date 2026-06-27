import type { RegistryEntry } from "@compify/shared";
import { ViewIntentLink } from "./ViewIntentLink";
import { GalleryCardFrame } from "./GalleryCardFrame";
import { GalleryCardMedia } from "./GalleryCardMedia";
import { AdminPinButton } from "./AdminPinButton";
import { AdminFeatureButton } from "./AdminFeatureButton";
import { AdminFeaturedUpButton } from "./AdminFeaturedUpButton";

export function GalleryCard({
  entry,
  priority = false,
  pinnable = false,
  featuredOrderable = false,
  column = 0,
}: {
  entry: RegistryEntry;
  priority?: boolean;
  /** Show the admin "move to top" control (default home grid only). */
  pinnable?: boolean;
  /** Show the admin "move to top of featured" control (Featured view only). */
  featuredOrderable?: boolean;
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
      {/* Admin overlays (all self-hide for non-admins): heart feature-toggle
          (top-left) on every card. Top-right holds one "move to top" arrow —
          the home-grid pin on the default grid, or the Featured reorder arrow in
          the Featured view (these views are mutually exclusive, so no overlap). */}
      <AdminFeatureButton slug={entry.name} featured={entry.featured} />
      {pinnable ? <AdminPinButton slug={entry.name} column={column} /> : null}
      {featuredOrderable ? <AdminFeaturedUpButton slug={entry.name} /> : null}
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
