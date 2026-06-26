import { useEffect } from "react";

// Opens the search palette on ⌘K (Mac) / Ctrl+K (Windows/Linux). Pass the
// stable setState setter from useState so the listener binds once.
export function useSearchHotkey(setOpen: (open: boolean) => void) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);
}
