# Compify UI — MCP Server

The Compify UI MCP server exposes the component registry to AI editors. Connect once in Claude Code, Cursor, Codex, or Windsurf — then fetch, customize, or generate Framer-safe components through natural language.

## Endpoints

| Environment | URL |
|---|---|
| Production | `https://compify-mcp.vercel.app/mcp` |
| Local dev | `http://localhost:8787/mcp` |

Health check: `GET /health`  
Server info: `GET /` (JSON manifest with tool list and component count)

---

## Quick start

### 1. Connect the MCP (one time)

**Claude Code**

```bash
claude mcp add compify-ui --url https://compify-mcp.vercel.app/mcp
```

**Cursor / Windsurf** — add to `.cursor/mcp.json` (project) or global MCP config:

```json
{
  "mcpServers": {
    "compify-ui": {
      "url": "https://compify-mcp.vercel.app/mcp"
    }
  }
}
```

**Codex**

```bash
export COMPIFY_UI_API_KEY=<your-api-key>
codex mcp add compify-ui --url https://compify-mcp.vercel.app/mcp --bearer-token-env-var COMPIFY_UI_API_KEY
```

Or edit `~/.codex/config.toml` directly:

```toml
[mcp_servers.compify-ui]
url = "https://compify-mcp.vercel.app/mcp"
bearer_token_env_var = "COMPIFY_UI_API_KEY"
```

For local development, replace the URL with `http://localhost:8787/mcp` after running `pnpm dev:mcp`.

### 2. Browse and tweak on the website (optional)

Open any component at [compify.ui](https://compify.ui), adjust the tweak panel, then click **Copy prompt**. The prompt encodes your exact configuration.

Example copied prompt:

```
Using compify-ui MCP, get me the pricing-three-tier component, dark theme, accent #7C3AED, 3 tiers, badge enabled.
```

### 3. Paste into your editor

Paste the prompt into chat. The model calls `get_component` or `generate_component`, writes the file, installs dependencies, and adds the import.

---

## Tools

### `list_components`

Returns the component index from `registry.json`.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `category` | `string` | No | Filter by category: `hero`, `navbar`, `pricing`, `cards`, `forms`, `animation`, `data` |

**Example prompt:** *"What hero components are available in compify-ui?"*

---

### `get_component`

Returns source code for a registry component, adapted to your stack.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | Registry slug, e.g. `pricing-three-tier` |
| `stack` | `framer` \| `react` \| `nextjs` \| `vite` | No | Target runtime. Default: `framer` |
| `styling` | `css` \| `tailwind` \| `cssmodules` | No | Styling system hint for the model |
| `typescript` | `boolean` | No | Emit TypeScript (default: true) |
| `tweaks` | `Record<string, string \| number \| boolean>` | No | Prop values from the website tweak panel |

**Stack behavior**

- `framer` — source as-authored, including `addPropertyControls`
- `react` / `vite` — Framer imports and property controls stripped
- `nextjs` — same as react, plus `"use client"` directive

**Example prompt:** *"Using compify-ui MCP, get me the sticky-navbar component for a Next.js project with Tailwind."*

The model should call:

```json
{
  "name": "sticky-navbar",
  "stack": "nextjs",
  "styling": "tailwind",
  "typescript": true
}
```

---

### `generate_component`

Generates a new or customized component using the Framer constraint system prompt.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `prompt` | `string` | Yes | Natural-language description of what to build |
| `baseComponent` | `string` | No | Registry slug to use as a starting point |
| `stack` | `framer` \| `react` \| `nextjs` \| `vite` | No | Target stack |
| `styling` | `css` \| `tailwind` \| `cssmodules` | No | Styling system |
| `typescript` | `boolean` | No | Emit TypeScript |

Requires `ANTHROPIC_API_KEY` on the server for full AI generation. Without it, returns a Framer-safe scaffold.

**Example prompt:** *"Generate a dark glassmorphism hero with a CTA button, based on fullscreen-hero."*

---

### `redesign_component`

Takes existing component source plus instructions and returns a redesigned version.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `code` | `string` | Yes | Current component source (read from the open file) |
| `instructions` | `string` | Yes | What to change |
| `stack` | `framer` \| `react` \| `nextjs` \| `vite` | No | Target stack |

**Example prompt:** *"Redesign this pricing card to use a green accent and remove the badge."*

---

## Workflows

### From the website

1. Open `/components/[name]`
2. Tweak props in the panel
3. Click **Copy prompt** (works in Claude Code, Cursor, Codex)
4. Paste into editor chat
5. Model calls MCP → file lands in your project

### From the editor only

No website required:

```
List all pricing components from compify-ui
```

```
Get the feature-card component for my React + Vite project
```

```
Generate a waitlist form with a purple accent and glass theme
```

### Stack-aware delivery

The model should read your `package.json`, `tailwind.config.js`, and `tsconfig.json`, then pass stack context when calling tools:

```
get_component({
  name: "newsletter-form",
  stack: "nextjs",
  styling: "tailwind",
  typescript: true
})
```

---

## Local development

```bash
# Terminal 1 — website
pnpm dev

# Terminal 2 — MCP server
pnpm dev:mcp
```

MCP runs at `http://localhost:8787/mcp`.

Optional AI generation — copy `packages/mcp-server/.env.example` to `.env`:

```env
PORT=8787
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-5
```

Point your editor at the local URL:

```bash
claude mcp add compify-ui --url http://localhost:8787/mcp
```

Verify the server:

```bash
curl http://localhost:8787/health
curl http://localhost:8787/
```

---

## Framer-safe generation rules

Every `generate_component` and `redesign_component` call is wrapped with the constraint system prompt in `packages/shared/src/framer-constraints.ts`:

- `export default function` (never named exports)
- `addPropertyControls` for every prop
- `framer-motion` for all animation (no CSS keyframes)
- SSR-guarded `window` / `document` access
- Inline styles only (no Tailwind or CSS modules in Framer)
- No external API calls or CDN scripts

This rule set is what makes generated components work first try on the Framer canvas.

---

## Example prompts

| Goal | Prompt |
|---|---|
| Browse catalog | `List all hero components from compify-ui` |
| Fetch for Framer | `Get the pricing-three-tier component from compify-ui` |
| Fetch for Next.js | `Get newsletter-form from compify-ui for Next.js with Tailwind` |
| With tweaks | `Using compify-ui MCP, get me pricing-three-tier, dark theme, accent #7C3AED` |
| Generate new | `Generate a minimal sticky navbar with blur backdrop using compify-ui` |
| Customize existing | `Using compify-ui, generate a darker version of fullscreen-hero with a coral accent` |
| Redesign file | `Redesign this component to use 2 pricing tiers instead of 3` |

---

## Troubleshooting

**MCP not showing in editor**

- Restart the editor after adding config
- Confirm the URL ends with `/mcp`
- For local dev, ensure `pnpm dev:mcp` is running

**`get_component` returns unknown component**

- Use the slug from the registry (`pricing-three-tier`), not the display name (`3-Tier Pricing`)
- Run `list_components` to see all available slugs

**Generated components look like scaffolds**

- Set `ANTHROPIC_API_KEY` in `packages/mcp-server/.env` for full AI generation
- Without the key, `generate_component` returns a minimal Framer-safe placeholder

**Component doesn't match website preview**

- Copy the prompt from the website after tweaking — it encodes non-default prop values
- Or pass `tweaks` explicitly: `{ "theme": "dark", "accent": "#7C3AED" }`

**Dependencies missing after delivery**

- The model should run `npm install` for packages listed in the tool response
- Common deps: `framer-motion`, `lucide-react`

---

## Architecture

```
registry.json  +  packages/library/src/components/*.tsx
        │
        ▼
packages/mcp-server  (Hono + @modelcontextprotocol/sdk)
        │
        ▼
  Streamable HTTP  /mcp
        │
        ▼
Claude Code · Cursor · Codex · Windsurf
```

The MCP server is stateless — each request creates a fresh MCP server instance. Component source is read from disk at request time, so edits to the library are reflected immediately without a restart.
