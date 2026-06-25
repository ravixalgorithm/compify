"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { RiLoginBoxLine, RiSearchLine } from "@remixicon/react";
import type { RegistryEntry } from "@compify/shared";
import { Logo } from "./Logo";
import { SectionDivider } from "./SectionDivider";
import { SearchModal } from "./SearchModal";
import { useUser } from "./AuthProvider";
import { UserMenu } from "./UserMenu";
import {
  SidebarNav,
  sortComponentsAlphabetically,
  type CategoryItem,
  type ComponentItem,
} from "./Sidebar";
import { ComponentVariantNav } from "./ComponentVariantNav";
import { sidebarSlideTransition } from "@/lib/motion";

/**
 * One sidebar for the whole app. The frame — logo, search, sign-in — is shared
 * and stays put; only the nav content slides between the gallery sections and
 * the component-detail variant nav. `initial={false}` skips the entrance
 * animation so a refresh on `/components/*` lands on the variant nav immediately;
 * client navigations still slide smoothly.
 */
export function UnifiedSidebar({
  categories,
  components,
  registry,
  query,
  onQuery,
  activeCategory,
  onCategory,
  activeSort,
  interactive,
}: {
  categories: CategoryItem[];
  components: ComponentItem[];
  registry: RegistryEntry[];
  query: string;
  onQuery: (v: string) => void;
  activeCategory: string | null;
  onCategory: (id: string | null) => void;
  activeSort: string | null;
  interactive: boolean;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, loading, openSignIn } = useUser();

  const pathname = usePathname() || "/";
  const isDetail = pathname.startsWith("/components/");
  const slug = isDetail ? pathname.split("/")[2] : undefined;
  const entry = slug ? registry.find((e) => e.name === slug) : undefined;
  const variants = entry
    ? registry.filter((e) => e.category === entry.category)
    : [];

  return (
    <aside className="sticky top-0 z-30 flex h-screen w-[290px] shrink-0 flex-col bg-bg 3xl:w-[400px]">
      <div className="absolute inset-y-0 right-0 z-10 flex">
          <div className="h-full w-px bg-divider" />
        </div>

      <div className="flex min-h-0 w-full flex-1 flex-col gap-[28px] p-[20px]">
        <div className="flex w-full shrink-0 flex-col gap-[8px]">
          <Logo />
          <SectionDivider />
        </div>

        <div className="flex min-h-0 w-full flex-1 flex-col gap-[18px]">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="ui-press ui-micro flex w-full shrink-0 items-center gap-[8px] border border-stroke bg-surface px-[12px] py-[10px] text-left hover:border-stroke/80 hover:bg-surface/80"
          >
            <RiSearchLine size={18} className="shrink-0 text-muted" />
            <span className="text-sm tracking-[-0.42px] text-muted 3xl:text-base">Search Components...</span>
          </button>

          <div className="relative min-h-0 flex-1 overflow-hidden">
            <motion.div
              className="flex h-full w-[200%]"
              initial={false}
              animate={{ x: isDetail ? "-50%" : "0%" }}
              transition={sidebarSlideTransition}
            >
              <div className="no-scrollbar h-full w-1/2 overflow-y-auto overscroll-contain pb-2">
                <SidebarNav
                  categories={categories}
                  components={components}
                  activeCategory={activeCategory}
                  onCategory={onCategory}
                  activeSort={activeSort}
                  interactive={interactive}
                />
              </div>
              <div className="no-scrollbar h-full w-1/2 overflow-y-auto overscroll-contain pb-2">
                <div className="flex w-full flex-col pb-10">
                  {entry ? (
                    <ComponentVariantNav
                      entry={entry}
                      variants={variants}
                    />
                  ) : null}
                </div>
              </div>
            </motion.div>
            {/* fade scroll content into the footer */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[65px] bg-gradient-to-b from-transparent to-bg"
              aria-hidden
            />
          </div>
        </div>
      </div>

      {/* Auth footer — flush to the sidebar edges (Figma 227:861) */}
      {loading ? (
        <div className="px-[20px]">
          <div className="h-[40px] w-full animate-pulse border-t border-[#2e3132] bg-elevated" />
        </div>
      ) : user ? (
        <UserMenu />
      ) : (
        // Float the Sign In button off the sidebar edges (Figma 227:861).
        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={openSignIn}
            className="ui-press ui-micro flex w-full shrink-0 cursor-pointer items-center gap-[8px] bg-white px-[12px] py-[9px] hover:bg-white/90"
          >
            <RiLoginBoxLine size={18} className="shrink-0 text-black" />
            <span className="text-sm tracking-[-0.42px] text-black">Sign In</span>
          </button>
        </div>
      )}

      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        categories={categories}
        entries={sortComponentsAlphabetically(components)}
        query={query}
        onQuery={onQuery}
        activeCategory={activeCategory}
        onCategory={onCategory}
      />
    </aside>
  );
}
