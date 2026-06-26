"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  RiLogoutBoxRLine,
  RiSearchLine,
  RiStackLine,
  RiStoreLine,
} from "@remixicon/react";
import { Logo } from "@/components/Logo";
import { SectionDivider } from "@/components/SectionDivider";
import { SearchModal } from "@/components/SearchModal";
import { SearchKbd } from "@/components/ui/kbd";
import { ActiveBg, ActiveDot } from "@/components/ActiveHighlight";
import { useUser } from "@/components/AuthProvider";
import { cn } from "@/lib/cn";
import { microTransition } from "@/lib/motion";
import { useSearchHotkey } from "@/lib/use-search-hotkey";

type ComponentLink = { name: string; displayName: string };

export function AdminShell({
  children,
  components,
}: {
  children: React.ReactNode;
  components: ComponentLink[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useUser();
  const [searchOpen, setSearchOpen] = useState(false);
  useSearchHotkey(setSearchOpen);

  // Admin access is the user's Supabase session + app_metadata.is_admin, so
  // "Sign out" is a normal Supabase sign-out. Once signed out the user is no
  // longer an admin, so the server admin layout sends them home on next visit.
  async function logout() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="sticky top-0 z-30 flex h-screen w-[260px] shrink-0 flex-col bg-bg">
        <div className="absolute inset-y-0 right-0 z-10 flex">
          <div className="h-full w-px bg-divider" />
        </div>

        <div className="flex h-full w-full flex-col gap-[28px] p-[20px]">
          <div className="flex w-full shrink-0 flex-col gap-[8px]">
            <Link href="/admin" className="flex items-center gap-3">
              <Logo />
              <span className="text-[11px] uppercase tracking-[0.14em] text-muted">Admin</span>
            </Link>
            <SectionDivider />
          </div>

          <div className="flex min-h-0 w-full flex-1 flex-col gap-[18px]">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="ui-press ui-micro flex w-full shrink-0 items-center gap-[8px] border border-stroke bg-surface px-[12px] py-[10px] text-left hover:border-stroke/80 hover:bg-surface/80"
            >
              <RiSearchLine size={18} className="shrink-0 text-muted" />
              <span className="min-w-0 truncate text-sm tracking-[-0.42px] text-muted">Search Components...</span>
              <SearchKbd className="ml-auto" />
            </button>

            <div className="flex min-h-0 w-full flex-1 flex-col justify-between">
              <div className="relative min-h-0 flex-1">
                <div className="no-scrollbar flex h-full min-h-0 flex-col gap-[18px] overflow-y-auto overscroll-contain pb-[48px]">
                  {/* All components → dashboard grid, then a divider. */}
                  <div className="flex w-full shrink-0 flex-col gap-[8px]">
                    <NavItem
                      href="/admin"
                      label="All Components"
                      icon={<RiStackLine size={18} />}
                      active={pathname === "/admin"}
                    />
                    <SectionDivider />
                  </div>

                  <Section label="Components">
                    {components.length === 0 ? (
                      <p className="px-[12px] py-[9px] text-sm tracking-[-0.42px] text-muted-foreground">
                        No components yet.
                      </p>
                    ) : (
                      components.map((c) => (
                        <ComponentRow
                          key={c.name}
                          name={c.name}
                          label={c.displayName}
                          active={pathname === `/admin/components/${c.name}`}
                        />
                      ))
                    )}
                  </Section>
                </div>
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[65px] bg-gradient-to-b from-transparent to-bg"
                  aria-hidden
                />
              </div>

              <div className="flex w-full shrink-0 flex-col gap-[2px]">
                <SectionDivider />
                <Link
                  href="/"
                  className="ui-micro mt-[14px] flex w-full items-center gap-[8px] px-[12px] py-[9px] text-muted transition hover:bg-elevated/40 hover:text-white"
                >
                  <RiStoreLine size={18} className="shrink-0" />
                  <span className="text-[14px] tracking-[-0.42px]">View marketplace</span>
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="ui-micro flex w-full items-center gap-[8px] px-[12px] py-[9px] text-left text-muted transition hover:bg-elevated/40 hover:text-white"
                >
                  <RiLogoutBoxRLine size={18} className="shrink-0" />
                  <span className="text-[14px] tracking-[-0.42px]">Sign out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-[1400px] px-8 py-8">{children}</div>
      </main>

      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        entries={components}
        onSelectComponent={(name) => router.push(`/admin/components/${name}`)}
      />
    </div>
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
        <p className="text-xs uppercase tracking-[-0.24px] text-white">{label}</p>
      </div>
      <div className="flex w-full flex-col gap-[2px]">{children}</div>
    </div>
  );
}

function NavItem({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
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
            className="truncate whitespace-nowrap text-sm tracking-[-0.42px]"
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
    <Link
      href={`/admin/components/${name}`}
      className={cn(
        "relative flex w-full items-center justify-between px-[12px] py-[9px]",
        !active && "hover:bg-elevated/40",
      )}
    >
      <ActiveBg active={active} />
      <motion.span
        className="relative z-10 truncate text-sm tracking-[-0.42px]"
        initial={false}
        animate={{
          color: active ? "#ffffff" : "#b8b8b8",
          fontWeight: active ? 500 : 400,
        }}
        transition={microTransition}
      >
        {label}
      </motion.span>
      <span className="relative z-10 flex size-[4px] shrink-0 items-center justify-center">
        <ActiveDot active={active} />
      </span>
    </Link>
  );
}
