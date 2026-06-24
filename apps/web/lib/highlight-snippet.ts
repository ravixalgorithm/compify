/** Token colours for MCP install snippets on dark surfaces. */
export const snippetSyntax = {
  keyword: "text-[#c792ea]",
  flag: "text-[#89ddff]",
  string: "text-[#c3e88d]",
  url: "text-[#ffcb6b]",
  placeholder: "text-accent",
  env: "text-[#f07178]",
  name: "text-[#82aaff]",
  punct: "text-[#5c5c5c]",
  plain: "text-[#e0e0e0]",
} as const;

export type SnippetToken = { text: string; className: string };

const SHELL_KEYWORDS = new Set(["export", "claude", "codex", "mcp", "add"]);

/** Tokenize a single shell line for MCP connect snippets. */
export function tokenizeShellLine(line: string): SnippetToken[] {
  const tokens: SnippetToken[] = [];
  let rest = line;

  while (rest.length > 0) {
    let match =
      rest.match(/^"[^"]*"/) ??
      rest.match(/^https?:\/\/\S+/) ??
      rest.match(/^<[^>]+>/) ??
      rest.match(/^--[\w-]+/) ??
      rest.match(/^(?:COMPIFY_UI_API_KEY)\b/) ??
      rest.match(/^(?:claude|codex|export|mcp|add)\b/) ??
      rest.match(/^[A-Z][A-Z0-9_]*\b/) ??
      rest.match(/^[a-z][\w-]*/i) ??
      rest.match(/^[={}]/) ??
      rest.match(/^\s+/) ??
      rest.match(/^./);

    if (!match) break;

    const text = match[0];
    let className: string = snippetSyntax.plain;

    if (/^"/.test(text)) className = snippetSyntax.string;
    else if (/^https?:\/\//.test(text)) className = snippetSyntax.url;
    else if (/^</.test(text)) className = snippetSyntax.placeholder;
    else if (/^--/.test(text)) className = snippetSyntax.flag;
    else if (text === "COMPIFY_UI_API_KEY") className = snippetSyntax.env;
    else if (SHELL_KEYWORDS.has(text)) className = snippetSyntax.keyword;
    else if (/^[A-Z][A-Z0-9_]*$/.test(text)) className = snippetSyntax.env;
    else if (text === "compify-ui" || text === "http") className = snippetSyntax.name;
    else if (/^[=]$/.test(text)) className = snippetSyntax.punct;
    else if (/^\s+$/.test(text)) className = snippetSyntax.plain;

    tokens.push({ text, className });
    rest = rest.slice(text.length);
  }

  return tokens;
}

/** Tokenize pretty-printed JSON (Cursor MCP config). */
export function tokenizeJson(code: string): SnippetToken[] {
  const tokens: SnippetToken[] = [];
  const re = /("(?:\\.|[^"\\])*")(\s*:)?|([{}\[\],:])|(\s+)/g;
  let match: RegExpExecArray | null;

  while ((match = re.exec(code)) !== null) {
    if (match[1]) {
      tokens.push({
        text: match[1],
        className: match[2] ? snippetSyntax.name : snippetSyntax.string,
      });
      if (match[2]) {
        tokens.push({ text: match[2], className: snippetSyntax.punct });
      }
      continue;
    }
    if (match[3]) {
      tokens.push({ text: match[3], className: snippetSyntax.punct });
      continue;
    }
    if (match[4]) {
      tokens.push({ text: match[4], className: snippetSyntax.plain });
    }
  }

  return tokens;
}
