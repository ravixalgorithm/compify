# Compify UI

A component **marketplace** + **MCP delivery layer** for Framer builders and React developers.

- **Designers** browse, preview, tweak, and copy production-ready components into Framer.
- **Developers** pull components straight into Cursor / Claude Code / Codex through the MCP — stack-aware, dependency-installed, import-ready.

Every component is **Framer-safe by spec**, and the same source renders in the website preview, on the Framer canvas, and when delivered by the MCP. What you preview is what ships.

---

## Monorepo layout

```
compify-ui/
├── packages/
│   ├── shared/        → registry types, theme tokens, Framer constraint prompt, registry loader
│   ├── library/       → 20 Framer-safe component .tsx sources + a `framer` shim for non-Framer envs
│   └── mcp-server/    → Hono + @modelcontextprotocol/sdk server (list / get / generate / redesign)
├── apps/
│   └── web/           → Next.js 14 marketplace (dashboard, component page, tweak panel, iframe preview)
└── registry.json      → single source of truth shared by the website and the MCP
```

## Prerequisites

- Node ≥ 20
- pnpm ≥ 10 (`corepack enable` or `npm i -g pnpm`)

## Setup

```bash
pnpm install
```

## Run the website

```bash
pnpm dev          # → http://localhost:3000
```

- `/` — dashboard with search, category tree, tag / stack / access filters, live hover previews.
- `/components/[name]` — live sandboxed iframe preview, real-time tweak panel, viewport switcher, copy-to-Framer + copy-MCP-prompt.
- `/connect` — MCP documentation: setup snippets, tools reference, workflows, examples, troubleshooting.

Full MCP docs: [`docs/MCP.md`](docs/MCP.md)

## Run the MCP server

```bash
pnpm dev:mcp      # → http://localhost:8787  (MCP endpoint at /mcp)
```

Optional AI generation (the `generate_component` / `redesign_component` tools) needs an Anthropic key — copy `packages/mcp-server/.env.example` to `.env` and set `ANTHROPIC_API_KEY`. Without it, those tools return a Framer-safe scaffold so the server still works end-to-end.

### MCP tools

See [`docs/MCP.md`](docs/MCP.md) for the full reference — setup per editor, workflows, examples, and troubleshooting.

## How "Framer-safe" is enforced

The core IP lives in `packages/shared/src/framer-constraints.ts` — a system prompt + rule set wrapped around every generation:

- `export default function` (not a named export)
- `addPropertyControls` for every prop
- framer-motion for all animation (never CSS keyframes)
- SSR-guarded `window`/`document` access
- inline styles only (no Tailwind / CSS modules)
- no external fetches or CDN scripts

The marketplace renders the exact same sources by aliasing the bare `framer` import to a no-op shim (`packages/library/src/framer-shim.ts`) via the bundler.

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Run the website. |
| `pnpm dev:mcp` | Run the MCP server. |
| `pnpm build` | Build all packages (website production build + typechecks). |
| `pnpm typecheck` | Typecheck every workspace. |

## Tech stack

Next.js 14 · React 18 · Tailwind CSS · framer-motion · lucide-react · Hono · `@modelcontextprotocol/sdk` · Anthropic SDK · pnpm workspaces.
