"use client";

import Link from "next/link";
import type { RegistryEntry } from "@compify/shared";
import { framerModuleUrl } from "@/lib/framer";
import { useClipboard } from "@/lib/useClipboard";
import { CopyButton } from "@/components/ui/copy-feedback";
import { cn } from "@/lib/cn";

function CopyButtonRow({ text }: { text: string }) {
  const { copied, copy } = useClipboard();

  return (
    <CopyButton
      copied={copied}
      onCopy={() => copy(text)}
      className="text-[11px] tracking-[-0.33px] text-[#999] hover:text-white"
    />
  );
}

export function FramerModuleList({ entries }: { entries: RegistryEntry[] }) {
  const published = entries.filter((entry) => framerModuleUrl(entry));
  const rows = published.length > 0 ? published : entries.slice(0, 8);

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex min-w-[640px] border border-[#2b2b2b] bg-[#1a1a1a] px-4 py-2.5 text-[11px] font-medium tracking-[-0.33px] text-[#999]">
        <span className="w-[200px] shrink-0">Component</span>
        <span className="min-w-0 flex-1">Module URL</span>
        <span className="w-[52px] shrink-0 text-right">Copy</span>
      </div>
      {rows.map((entry, index) => {
        const url = framerModuleUrl(entry);
        return (
          <div
            key={entry.name}
            className={cn(
              "flex min-w-[640px] items-center border border-t-0 border-[#2b2b2b] px-4 py-3 text-[12px] tracking-[-0.36px]",
              index % 2 === 0 ? "bg-[#111]" : "bg-[#161616]",
            )}
          >
            <Link
              href={`/components/${entry.name}`}
              className="ui-micro w-[200px] shrink-0 font-medium text-white hover:text-[#fa7319]"
            >
              {entry.displayName}
            </Link>
            <span className="min-w-0 flex-1 truncate pr-4 font-mono text-[#999]">
              {url ?? "Publishing soon — host on Framer, then add URL in admin"}
            </span>
            <span className="w-[52px] shrink-0 text-right">
              {url ? <CopyButtonRow text={url} /> : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}
