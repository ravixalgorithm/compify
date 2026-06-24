"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type GalleryFilterContextValue = {
  query: string;
  setQuery: (value: string) => void;
  category: string | null;
  setCategory: (value: string | null) => void;
};

const GalleryFilterContext = createContext<GalleryFilterContextValue | null>(null);

function pushParams(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  params: URLSearchParams,
) {
  const qs = params.toString();
  router.push(qs ? `${pathname}?${qs}` : pathname);
}

export function GalleryFilterProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();

  const query = searchParams.get("q") ?? "";
  const category = searchParams.get("category");

  const updateParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      pushParams(router, pathname, params);
    },
    [router, pathname, searchParams],
  );

  const setQuery = useCallback(
    (value: string) => {
      updateParams((params) => {
        if (value) params.set("q", value);
        else params.delete("q");
      });
    },
    [updateParams],
  );

  const setCategory = useCallback(
    (value: string | null) => {
      updateParams((params) => {
        // Library filter and explore sort are mutually exclusive.
        params.delete("sort");
        if (value) params.set("category", value);
        else params.delete("category");
      });
    },
    [updateParams],
  );

  const value = useMemo(
    () => ({ query, setQuery, category, setCategory }),
    [query, setQuery, category, setCategory],
  );

  return (
    <GalleryFilterContext.Provider value={value}>{children}</GalleryFilterContext.Provider>
  );
}

export function useGalleryFilter() {
  const value = useContext(GalleryFilterContext);
  if (!value) {
    throw new Error("useGalleryFilter must be used within GalleryFilterProvider");
  }
  return value;
}
