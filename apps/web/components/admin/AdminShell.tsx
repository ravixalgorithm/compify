"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGroup, motion } from "framer-motion";
import {
  RiAddLine,
  RiLogoutBoxRLine,
  RiStackLine,
  RiStoreLine,
  type RemixiconComponentType,
} from "@remixicon/react";
import { Logo } from "@/components/Logo";
import { SectionDivider } from "@/components/SectionDivider";
import { cn } from "@/lib/cn";
import { layoutTransition, microTransition } from "@/lib/motion";

const NAV: { href: string; label: string; Icon: RemixiconComponentType; exact?: boolean }[] = [
  { href: "/admin", label: "Components", Icon: RiStackLine, exact: true },
  { href: "/admin/components/new", label: "Add new", Icon: RiAddLine },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="sticky top-0 z-30 flex h-screen w-[260px] shrink-0 flex-col bg-bg pb-[12px]">
        <div className="absolute inset-y-0 right-0 z-10 flex">
          <div className="h-full w-px bg-divider" />
        </div>

        <div className="flex h-full w-[260px] flex-col gap-[28px] p-[20px]">
          <div className="flex w-full shrink-0 flex-col gap-[8px]">
            <Link href="/admin" className="flex items-center gap-3">
              <Logo />
              <span className="text-[11px] uppercase tracking-[0.14em] text-muted">Admin</span>
            </Link>
            <SectionDivider />
          </div>

          <div className="flex min-h-0 w-full flex-1 flex-col justify-between">
            <Section label="Manage">
              <LayoutGroup id="admin-nav">
                {NAV.map(({ href, label, Icon, exact }) => (
                  <NavItem
                    key={href}
                    href={href}
                    label={label}
                    icon={<Icon size={18} />}
                    active={exact ? pathname === href : pathname.startsWith(href)}
                  />
                ))}
              </LayoutGroup>
            </Section>

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
      </aside>

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-[1400px] px-8 py-8">{children}</div>
      </main>
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
        <p className="text-[12px] uppercase tracking-[-0.24px] text-white">{label}</p>
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
      {active ? (
        <motion.span
          layout
          layoutId="admin-nav-active-bg"
          className="absolute inset-0 bg-elevated"
          transition={layoutTransition}
        />
      ) : null}
      <span className="relative z-10 flex w-full items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-[8px]">
          <motion.span
            className="shrink-0 [&_svg]:size-[18px]"
            initial={false}
            animate={{ color: active ? "#ffffff" : "#999999" }}
            transition={microTransition}
          >
            {icon}
          </motion.span>
          <motion.span
            className="truncate whitespace-nowrap text-[14px] tracking-[-0.42px]"
            initial={false}
            animate={{
              color: active ? "#ffffff" : "#999999",
              fontWeight: active ? 500 : 400,
            }}
            transition={microTransition}
          >
            {label}
          </motion.span>
        </span>
        <span className="flex size-[4px] shrink-0 items-center justify-center">
          {active ? (
            <motion.span
              layout
              layoutId="admin-nav-active-dot"
              className="size-[4px] bg-white"
              transition={layoutTransition}
            />
          ) : null}
        </span>
      </span>
    </Link>
  );
}
