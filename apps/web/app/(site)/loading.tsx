/**
 * Instant route fallback for dynamic (site) navigations (home, intro). Without
 * it, navigating to a live-data page blocks on the server roundtrip before
 * anything paints — so the sidebar slide can't start and the whole transition
 * stutters in at once. With it, the navigation commits immediately to this
 * skeleton: the sidebar slide runs right away (CSS/compositor) while the real
 * content streams in. Mirrors the gallery's main layout so there's no shift.
 */
const SKELETON_COLUMNS: number[][] = [
  [220, 188, 268, 200],
  [248, 236, 180, 240],
  [200, 268, 220, 188],
];

export default function SiteLoading() {
  return (
    <main className="relative min-w-0 flex-1 p-1.5">
      <div className="min-h-[calc(100vh-12px)] bg-bg p-[26px] shadow-[0px_4px_10px_rgba(0,0,0,0.04)]">
        <div className="flex gap-[14px]">
          {SKELETON_COLUMNS.map((heights, ci) => (
            <div key={ci} className="flex min-w-0 flex-1 flex-col gap-[14px]">
              {heights.map((h, i) => (
                <div
                  key={i}
                  className="relative w-full overflow-hidden bg-[#161616]"
                  style={{ height: h }}
                  aria-hidden
                >
                  <div className="ui-skeleton-shimmer absolute inset-0" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
