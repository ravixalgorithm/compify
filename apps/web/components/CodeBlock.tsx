"use client";

import { useClipboard } from "@/lib/useClipboard";
import { CopyButton } from "@/components/ui/copy-feedback";

export function CodeBlock({
  label,
  code,
  language = "bash",
}: {
  label?: string;
  code: string;
  language?: string;
}) {
  const { copied, copy } = useClipboard();

  return (
    <div className="overflow-hidden rounded-lg ui-ring">
      <div className="flex items-center justify-between border-b border-stroke px-3 py-2">
        <span className="font-mono text-2xs text-muted-foreground">
          {label ?? language}
        </span>
        <CopyButton
          copied={copied}
          onCopy={() => copy(code)}
          className="text-2xs text-muted-foreground hover:text-foreground"
          iconSize={11}
        />
      </div>
      <pre className="overflow-x-auto bg-surface p-4 font-mono text-2xs leading-relaxed text-muted">
        <code>{code}</code>
      </pre>
    </div>
  );
}
