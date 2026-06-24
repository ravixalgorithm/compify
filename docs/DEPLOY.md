# Compify UI — Deployment

This monorepo deploys as **two separate Vercel projects** from the same Git repository.

| Service | Vercel project | Production URL |
|--------|----------------|----------------|
| Dashboard (Next.js) | `web` | https://web-opal-beta-70.vercel.app |
| MCP server (Hono) | `compify-mcp` | https://compify-mcp.vercel.app |

Custom domains (optional later):

- `compify.ui` → `web` project
- `mcp.compify.ui` → `compify-mcp` project (CNAME to Vercel)

---

## Architecture

```
compifyUI/                          ← deploy CLI runs from here
├── apps/web/                       ← Vercel project root: web
│   └── vercel.json
├── packages/mcp-server/            ← Vercel project root: compify-mcp
│   ├── src/index.ts                ← Hono default export (serverless)
│   ├── src/dev.ts                  ← local Node server (`pnpm dev:mcp`)
│   ├── scripts/stage-registry.mjs  ← bundles registry + sources at build
│   └── vercel.json
├── registry.json
└── packages/library/src/components/
```

The dashboard bundles React components at **build time** for live previews. The MCP server reads `registry.json` and raw component sources at **runtime** from a staged `bundle/` directory created during the MCP build.

---

## Environment variables

### Dashboard (`web`)

Set in Vercel → Project → Settings → Environment Variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase publishable key (user auth) |
| `NEXT_PUBLIC_MCP_URL` | Yes | `https://compify-mcp.vercel.app/mcp` |
| `COMPIFY_ADMIN_TOKEN` | Yes | Password for `/admin` |

### MCP (`compify-mcp`)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Same Supabase URL as the dashboard |
| `SUPABASE_PUBLISHABLE_KEY` | Yes | Used to call `verify_api_key` RPC |
| `MCP_REQUIRE_API_KEY` | Yes | Set to `true` in production |

Optional: `SUPABASE_SERVICE_ROLE_KEY` instead of the publishable key (server-side only).

---

## Deploy from CLI

Prerequisites: [Vercel CLI](https://vercel.com/docs/cli) logged in (`npx vercel login`).

### 1. Dashboard

```bash
cd compifyUI
npx vercel deploy --prod --yes --project web
```

Project settings (already configured):

- **Root Directory:** `apps/web`
- **Install Command:** `pnpm install` (from monorepo root)
- **Build Command:** `pnpm --filter @compify/web build`

### 2. MCP server

```bash
cd compifyUI
npx vercel deploy --prod --yes --project compify-mcp
```

Project settings (already configured):

- **Root Directory:** `packages/mcp-server`
- **Install Command:** `pnpm install`
- **Build Command:** `pnpm --filter @compify/mcp-server typecheck && pnpm --filter @compify/mcp-server build:vercel`
- **Framework:** Hono (zero-config, `export default` from `src/index.ts`)

After deploying MCP, ensure `NEXT_PUBLIC_MCP_URL` on the `web` project matches the MCP production URL.

---

## Verify production

### Dashboard

```bash
curl -I https://web-opal-beta-70.vercel.app
curl -I https://web-opal-beta-70.vercel.app/connect
```

Both should return `200`.

### MCP

```bash
curl https://compify-mcp.vercel.app/health
# → {"ok":true}

curl https://compify-mcp.vercel.app/
# → JSON manifest with component count

curl -o /dev/null -w "%{http_code}\n" https://compify-mcp.vercel.app/mcp
# → 401 (auth required without API key)
```

### End-to-end MCP

1. Open the dashboard → sign in → Profile → API Keys → create a key.
2. Connect an editor (see [MCP.md](./MCP.md)):

```bash
claude mcp add compify-ui --transport http \
  --url https://compify-mcp.vercel.app/mcp \
  --header "Authorization: Bearer YOUR_API_KEY"
```

3. In Claude/Cursor/Codex, call `list_components` — you should see all registry entries.

---

## Local development

```bash
pnpm install
pnpm dev          # web :3000 + MCP :8787
# or
pnpm dev:web      # dashboard only
pnpm dev:mcp      # MCP only (uses src/dev.ts)
```

Local MCP URL: `http://localhost:8787/mcp`

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| MCP `registry.json not found` | Redeploy `compify-mcp`; build must run `build:vercel` to stage `bundle/` |
| MCP `401` on `/mcp` | Expected without a key; create one in the dashboard |
| Dashboard previews work but MCP `get_component` fails | Check `bundle/components/*.source` files are included (`vercel.json` → `includeFiles`) |
| `Invalid export` on deploy | Do not name server files `app.ts` in `src/` — use `hono-app.ts`; only `src/index.ts` should default-export the Hono app |
| Monorepo `workspace:*` not found | Deploy from repo root with correct **Root Directory**; install must be `pnpm install` at monorepo root |

---

## Related docs

- [MCP.md](./MCP.md) — editor setup, tools, prompts
- [apps/web/.env.example](../apps/web/.env.example) — local dashboard env template
- [packages/mcp-server/.env.example](../packages/mcp-server/.env.example) — local MCP env template
