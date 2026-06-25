"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutGroup, motion } from "framer-motion";
import {
  RiCodeSSlashLine,
  RiHeartLine,
  RiHomeLine,
  RiLineChartLine,
  RiLoginBoxLine,
  RiPlugLine,
  RiSearchLine,
  type RemixiconComponentType,
} from "@remixicon/react";
import type { RegistryEntry } from "@compify/shared";
import { Logo } from "./Logo";
import { ViewIntentLink } from "./ViewIntentLink";
import { SectionDivider } from "./SectionDivider";
import { SignInModal } from "./SignInModal";
import { SearchModal } from "./SearchModal";
import { useUser } from "./AuthProvider";
import { cn } from "@/lib/cn";
import { microTransition } from "@/lib/motion";
import { ActiveBg, ActiveDot } from "./ActiveHighlight";

export interface CategoryItem {
  id: string;
  label: string;
  count: number;
}

export type ComponentItem = Pick<RegistryEntry, "name" | "displayName">;

export function sortComponentsAlphabetically<T extends ComponentItem>(items: T[]): T[] {
  return [...items].sort((a, b) => a.displayName.localeCompare(b.displayName));
}

const EXPLORE: { href: string; label: string; sort: string; Icon: RemixiconComponentType }[] = [
  { href: "/?sort=trending", label: "Trending", sort: "trending", Icon: RiLineChartLine },
  { href: "/?sort=featured", label: "Featured", sort: "featured", Icon: RiHeartLine },
];

function FramerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-[18px] shrink-0", className)}
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M8.99935 11.0416H4.62435"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path
        d="M13.3757 2.87498H4.91732L9.00065 6.95831H13.3757V2.87498Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path
        d="M13.0827 11.0417L8.99935 6.95835H4.62435V11.0417L8.99935 15.125V11.0417H13.0827Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NavItem({
  href,
  label,
  icon,
  active,
  layoutId = "sidebar-nav-active-bg",
  dotLayoutId = "sidebar-nav-active-dot",
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  layoutId?: string;
  dotLayoutId?: string;
}) {
  return (
    <Link
      href={href}
      prefetch
      className={cn(
        "relative flex w-full items-center overflow-hidden px-[12px] py-[9px]",
        !active && "hover:bg-elevated/40",
      )}
    >
      <ActiveBg active={active} />
      <span className="relative z-10 flex w-full items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-[8px]">
          <motion.span
            className="shrink-0 [&_svg]:size-[18px]"
            initial={false}
            animate={{ color: active ? "#ffffff" : "#b8b8b8" }}
            transition={microTransition}
          >
            {icon}
          </motion.span>
          <motion.span
            className="truncate whitespace-nowrap text-sm tracking-[-0.42px] 3xl:text-base"
            initial={false}
            animate={{
              color: active ? "#ffffff" : "#b8b8b8",
              fontWeight: active ? 500 : 400,
            }}
            transition={microTransition}
          >
            {label}
          </motion.span>
        </span>
        <span className="flex size-[4px] shrink-0 items-center justify-center">
          <ActiveDot active={active} />
        </span>
      </span>
    </Link>
  );
}

/**
 * The scrollable nav sections of the main sidebar (Get started / Explore /
 * Libraries / Components). Extracted so the unified sidebar can slide it in and
 * out independently of the shared frame (logo, search, sign-in).
 */
export function SidebarNav({
  categories,
  components,
  activeCategory,
  onCategory,
  activeSort = null,
  interactive = false,
}: {
  categories: CategoryItem[];
  components: ComponentItem[];
  activeCategory?: string | null;
  onCategory?: (id: string | null) => void;
  activeSort?: string | null;
  interactive?: boolean;
}) {
  const pathname = usePathname();
  const { isAdmin } = useUser();
  const introductionActive = pathname === "/intro";

  return (
    <div className="flex w-full flex-col gap-[24px] pb-10">
      <Section label="Get started">
        <LayoutGroup id="get-started-nav">
          <NavItem
            href="/intro"
            label="Introduction"
            icon={<RiHomeLine size={18} />}
            active={introductionActive}
            layoutId="get-started-active-bg"
            dotLayoutId="get-started-active-dot"
          />
          <NavItem
            href="/connect"
            label="MCP Integrations"
            icon={<RiPlugLine size={18} />}
            active={pathname === "/connect"}
            layoutId="get-started-active-bg"
            dotLayoutId="get-started-active-dot"
          />
          <NavItem
            href="/framer"
            label="Framer Integration"
            icon={<FramerIcon />}
            active={pathname === "/framer"}
            layoutId="get-started-active-bg"
            dotLayoutId="get-started-active-dot"
          />
          {isAdmin ? (
            <NavItem
              href="/admin"
              label="Admin panel"
              icon={<RiCodeSSlashLine size={18} />}
              active={pathname.startsWith("/admin")}
              layoutId="get-started-active-bg"
              dotLayoutId="get-started-active-dot"
            />
          ) : null}
        </LayoutGroup>
      </Section>

      <SectionDivider />

      <Section label="Explore">
        <LayoutGroup id="explore-nav">
          {EXPLORE.map(({ href, label, sort: sortKey, Icon }) => (
            <NavItem
              key={label}
              href={href}
              label={label}
              icon={<Icon size={18} />}
              active={pathname === "/" && activeSort === sortKey && !activeCategory}
              layoutId="explore-active-bg"
              dotLayoutId="explore-active-dot"
            />
          ))}
        </LayoutGroup>
      </Section>

      <SectionDivider />

      <Section label="Libraries">
        <LayoutGroup id="libraries-nav">
          {categories.map((c) => (
            <LibraryRow
              key={c.id}
              label={c.label}
              count={c.count}
              active={interactive ? activeCategory === c.id && !activeSort : false}
              interactive={interactive}
              href={`/?category=${c.id}`}
              onClick={() => onCategory?.(activeCategory === c.id ? null : c.id)}
              layoutId="libraries-active-bg"
              dotLayoutId="libraries-active-dot"
            />
          ))}
        </LayoutGroup>
      </Section>

      <SectionDivider />

      <Section label="Other Components">
        <LayoutGroup id="components-nav">
          {sortComponentsAlphabetically(components).map((c) => (
            <ComponentRow
              key={c.name}
              name={c.name}
              label={c.displayName}
              active={pathname === `/components/${c.name}`}
            />
          ))}
        </LayoutGroup>
      </Section>
    </div>
  );
}

export function Sidebar({
  categories,
  components,
  query,
  onQuery,
  activeCategory,
  onCategory,
  activeSort = null,
  interactive = false,
  embedded = false,
}: {
  categories: CategoryItem[];
  components: ComponentItem[];
  total?: number;
  query?: string;
  onQuery?: (v: string) => void;
  activeCategory?: string | null;
  onCategory?: (id: string | null) => void;
  activeSort?: string | null;
  interactive?: boolean;
  /** When true, fills its parent instead of being its own sticky 290px rail. */
  embedded?: boolean;
}) {
  const [signInOpen, setSignInOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col bg-bg pb-4",
        embedded
          ? "h-full w-full"
          : "sticky top-0 z-30 h-screen w-[290px] shrink-0",
      )}
    >
      {!embedded ? (
        <div className="absolute inset-y-0 right-0 z-10 flex">
          <div className="h-full w-px bg-divider" />
        </div>
      ) : null}

      <div className="flex h-full w-full flex-col gap-[28px] p-[20px]">
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
            <span className="text-sm tracking-[-0.42px] 3xl:text-base text-muted">Search Components...</span>
          </button>

          <div className="flex min-h-0 w-full flex-1 flex-col justify-between">
            <div className="relative min-h-0 flex-1">
              <div className="no-scrollbar h-full min-h-0 overflow-y-auto overscroll-contain">
                <SidebarNav
                  categories={categories}
                  components={components}
                  activeCategory={activeCategory}
                  onCategory={onCategory}
                  activeSort={activeSort}
                  interactive={interactive}
                />
              </div>
              {/* Figma 133:1360 — fade scroll content into Sign In */}
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[65px] bg-gradient-to-b from-transparent to-bg"
                aria-hidden
              />
            </div>

            <button
              type="button"
              onClick={() => setSignInOpen(true)}
              className="ui-press ui-micro flex w-full shrink-0 cursor-pointer items-center gap-[8px] bg-white px-[12px] py-[9px] hover:bg-white/90"
            >
              <RiLoginBoxLine size={18} className="shrink-0 text-black" />
              <span className="text-sm tracking-[-0.42px] text-black">Sign In</span>
            </button>
          </div>
        </div>
      </div>

      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />
      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        categories={categories}
        entries={sortComponentsAlphabetically(components)}
        query={query ?? ""}
        onQuery={onQuery}
        activeCategory={activeCategory}
        onCategory={onCategory}
      />
    </aside>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex w-full shrink-0 flex-col gap-[14px]">
      <div className="flex items-center pl-[14px]">
        <p className="text-xs uppercase tracking-[-0.24px] text-white 3xl:text-sm">{label}</p>
      </div>
      <div className="flex w-full flex-col gap-[2px]">{children}</div>
    </div>
  );
}

function LibraryRow({
  label,
  count,
  active,
  interactive,
  href,
  onClick,
  layoutId = "libraries-active-bg",
  dotLayoutId = "libraries-active-dot",
}: {
  label: string;
  count: number;
  active: boolean;
  interactive: boolean;
  href: string;
  onClick: () => void;
  layoutId?: string;
  dotLayoutId?: string;
}) {
  const className = cn(
    "relative flex w-full items-center justify-between overflow-hidden px-[12px] py-[9px] text-left",
    !active && "hover:bg-elevated/40",
  );

  const inner = (
    <>
      <ActiveBg active={active} />
      <motion.span
        className="relative z-10 truncate text-sm tracking-[-0.42px] 3xl:text-base"
        initial={false}
        animate={{
          color: active ? "#ffffff" : "#b8b8b8",
          fontWeight: active ? 500 : 400,
        }}
        transition={microTransition}
      >
        {label}
      </motion.span>
      <span className="relative z-10 flex shrink-0 items-center gap-[6px]">
        <span className="flex size-[4px] items-center justify-center">
          <ActiveDot active={active} />
        </span>
        <motion.span
          className="text-sm tracking-[-0.42px] 3xl:text-base"
          initial={false}
          animate={{ color: active ? "#ffffff" : "#b8b8b8" }}
          transition={microTransition}
        >
          {count}
        </motion.span>
      </span>
    </>
  );

  if (interactive) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {inner}
      </button>
    );
  }
  return (
    <Link href={href} prefetch className={className}>
      {inner}
    </Link>
  );
}

function ComponentRow({
  name,
  label,
  active,
}: {
  name: string;
  label: string;
  active: boolean;
}) {
  return (
    <ViewIntentLink
      slug={name}
      href={`/components/${name}`}
      prefetch
      className={cn(
        "relative flex w-full items-center overflow-hidden px-[12px] py-[9px] text-left",
        !active && "hover:bg-elevated/40",
      )}
    >
      <ActiveBg active={active} />
      <motion.span
        className="relative z-10 truncate text-sm tracking-[-0.42px] 3xl:text-base"
        initial={false}
        animate={{
          color: active ? "#ffffff" : "#b8b8b8",
          fontWeight: active ? 500 : 400,
        }}
        transition={microTransition}
      >
        {label}
      </motion.span>
    </ViewIntentLink>
  );
}
