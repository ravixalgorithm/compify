"use client";

import { useState, type ReactNode } from "react";
import type { RegistryEntry } from "@compify/shared";
import { useClipboard } from "@/lib/useClipboard";
import { SectionDivider } from "@/components/SectionDivider";
import { AnimatedTabPanels } from "@/components/ui/tabs";
import { CopyButton } from "@/components/ui/copy-feedback";
import { cn } from "@/lib/cn";

type Tab = "description" | "props" | "dependencies" | "usage" | "source";

const TABS: { id: Tab; label: string }[] = [
  { id: "description", label: "About" },
  { id: "props", label: "Props" },
  { id: "dependencies", label: "Deps" },
  { id: "usage", label: "Usage" },
  { id: "source", label: "Source" },
];

export function InfoTabs({ entry, source }: { entry: RegistryEntry; source: string }) {
  const [tab, setTab] = useState<Tab>("description");

  const panels: Record<Tab, ReactNode> = {
    description: (
      <div className="max-w-lg space-y-4 text-sm leading-relaxed text-muted">
        <p>{entry.description}</p>
        <p className="text-muted-foreground">
          Framer-safe: default export, property controls, framer-motion, inline styles.
        </p>
      </div>
    ),
    props: (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-2xs text-muted-foreground">
              <th className="pb-3 pr-6 font-medium">Name</th>
              <th className="pb-3 pr-6 font-medium">Type</th>
              <th className="pb-3 pr-6 font-medium">Default</th>
              <th className="pb-3 font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="text-muted">
            {entry.props.map((p) => (
              <tr key={p.name} className="border-t border-stroke">
                <td className="py-3 pr-6 font-mono text-2xs text-foreground">{p.name}</td>
                <td className="py-3 pr-6 font-mono text-2xs text-muted-foreground">{p.type}</td>
                <td className="py-3 pr-6 font-mono text-2xs text-muted-foreground">{p.default}</td>
                <td className="py-3">{p.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
    dependencies: (
      <div className="space-y-4">
        {entry.dependencies.length ? (
          <>
            <p className="font-mono text-2xs text-muted">
              {entry.dependencies.join(" · ")}
            </p>
            <CodeBlock label="install" code={`npm install ${entry.dependencies.join(" ")}`} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">None</p>
        )}
      </div>
    ),
    usage: <CodeBlock code={entry.usage} />,
    source: <CodeBlock code={source} scroll />,
  };

  return (
    <div>
      <SectionDivider className="mb-10" />
      <div className="mb-6 flex gap-6 border-b border-stroke">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "ui-micro -mb-px border-b pb-3 text-sm",
              tab === t.id
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-muted",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatedTabPanels value={tab} panels={panels} />
    </div>
  );
}

function CodeBlock({ code, label, scroll }: { code: string; label?: string; scroll?: boolean }) {
  const { copied, copy } = useClipboard();
  return (
    <div className="overflow-hidden rounded-lg ui-ring">
      <div className="flex items-center justify-between border-b border-stroke px-3 py-2">
        <span className="font-mono text-2xs text-muted-foreground">{label ?? "code"}</span>
        <CopyButton
          copied={copied}
          onCopy={() => copy(code)}
          className="text-2xs text-muted-foreground hover:text-foreground"
          iconSize={11}
        />
      </div>
      <pre
        className={cn(
          "overflow-x-auto bg-surface p-4 font-mono text-2xs leading-relaxed text-muted",
          scroll && "max-h-96 overflow-y-auto",
        )}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
