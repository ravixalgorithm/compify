import type { Editor } from "@/lib/prompt";
import { tokenizeJson, tokenizeShellLine } from "@/lib/highlight-snippet";
import { cn } from "@/lib/cn";

export function McpSnippetCode({
  editor,
  code,
  className,
}: {
  editor: Editor;
  code: string;
  className?: string;
}) {
  const lines = code.split("\n");
  // Cursor, Windsurf, and Antigravity show a JSON config; the rest are shell.
  const isJson = editor === "cursor" || editor === "windsurf" || editor === "antigravity";

  return (
    <pre
      className={cn(
        "mt-2 min-w-0 whitespace-pre-wrap break-all font-[family-name:var(--font-roboto-mono)] text-[12px] leading-[18px] tracking-[-0.36px]",
        className,
      )}
    >
      <code>
        {isJson
          ? tokenizeJson(code).map((token, index) => (
              <span key={index} className={token.className}>
                {token.text}
              </span>
            ))
          : lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {tokenizeShellLine(line).map((token, index) => (
                  <span key={index} className={token.className}>
                    {token.text}
                  </span>
                ))}
                {lineIndex < lines.length - 1 ? "\n" : null}
              </span>
            ))}
      </code>
    </pre>
  );
}
