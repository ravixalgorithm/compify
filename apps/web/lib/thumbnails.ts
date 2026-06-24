import type { RegistryEntry } from "@compify/shared";

/** Toggle gallery card thumbnails — off uses live component previews. */
export const GALLERY_USE_THUMBNAILS = false;

/** Public path for a component gallery thumbnail. */
export function componentThumbnail(entry: RegistryEntry): string {
  return entry.thumbnail ?? `/thumbnails/${entry.name}.png`;
}