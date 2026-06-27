"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { RiCodeSSlashLine, RiPlugLine } from "@remixicon/react";
import { cn } from "@/lib/cn";
import type { IntegrationTab } from "@/lib/integration-tabs";

/** Framer glyph that tints with the current text color. */
function FramerGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden xmlns="http://www.w3.org/2000/svg">
      <path d="M8.99935 11.0416H4.62435" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
      <path d="M13.3757 2.87498H4.91732L9.00065 6.95831H13.3757V2.87498Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
      <path d="M13.0827 11.0417L8.99935 6.95835H4.62435V11.0417L8.99935 15.125V11.0417H13.0827Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
    </svg>
  );
}

const TABS: { id: IntegrationTab; label: string; icon: ReactNode }[] = [
  { id: "mcp", label: "MCP", icon: <RiPlugLine size={18} /> },
  { id: "framer", label: "Framer", icon: <FramerGlyph /> },
  { id: "code", label: "Code", icon: <RiCodeSSlashLine size={18} /> },
];

/**
 * The single Integrations page: a segmented MCP / Framer / Code tab bar over the
 * three docs bodies (rendered on the server and passed in as props). Switching is
 * instant client state — the inactive bodies aren't mounted — and the URL is kept
 * in sync (?tab=) so a tab is shareable, refresh-safe, and deep-linkable.
 */
export function IntegrationTabs({
  initialTab,
  mcp,
  framer,
  code,
}: {
  initialTab: IntegrationTab;
  mcp: ReactNode;
  framer: ReactNode;
  code: ReactNode;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<IntegrationTab>(initialTab);

  // Adopt the tab from the URL on a real navigation here (e.g. an in-doc link to
  // ?tab=framer, or browser back/forward). In-tab clicks set state first, so this
  // only re-affirms.
  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  function select(next: IntegrationTab) {
    if (next === tab) return;
    setTab(next); // instant
    // Keep the URL/searchParams consistent without scrolling or refetching the view.
    router.replace(`/integrations?tab=${next}`, { scroll: false });
  }

  const body = tab === "framer" ? framer : tab === "code" ? code : mcp;

  return (
    <div className="font-[family-name:var(--font-roboto-mono)] min-h-[calc(100vh-12px)] bg-bg px-6 pb-12 pt-[70px] sm:px-10 lg:px-12 xl:px-20 2xl:px-[120px]">
      <div className="mx-auto w-full max-w-[1042px]">
        <div className="flex items-center py-[10px]">
          <div role="tablist" aria-label="Integration method" className="flex items-stretch bg-[#242424]">
            {TABS.map((t) => {
              const active = t.id === tab;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => select(t.id)}
                  className={cn(
                    "ui-micro flex h-[32px] items-center gap-[6px] px-[10px] py-[4px] text-base leading-[24px] tracking-[-0.48px]",
                    active ? "bg-black text-white" : "text-[#b8b8b8] hover:text-white",
                  )}
                >
                  <span className="flex shrink-0 items-center [&_svg]:size-[18px]">{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {body}
      </div>
    </div>
  );
}
