import type { ReactNode } from "react";
import { GalleryCardCorners } from "./GalleryCardCorners";

/** Gallery card shell — dashed corners overlay; height follows preview content. */
export function GalleryCardFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative w-full bg-bg">
      <div className="gallery-preview-inner relative isolate w-full overflow-hidden bg-bg [contain:paint]">
        {children}
      </div>
      <GalleryCardCorners />
    </div>
  );
}
