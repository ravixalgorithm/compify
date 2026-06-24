# Component Storage + Render Architecture (Strategy D)

**Status:** Design / pre-build
**Date:** 2026-06-24
**Decided:** `/plan-ceo-review`
**Mode:** SELECTIVE EXPANSION on an existing system

---

## Problem (precise)

Reads work in production today. `registry.json` and the component `.tsx` files
are committed, so they ship in the Vercel bundle and both the website and MCP
read them fine in prod. The *only* thing broken is **admin publish writes**:
`writeFileSync` for `.tsx`, `.meta.json`, `registry.json`, and the thumbnail
(`packages/shared/src/publish-component.ts`). Vercel's runtime filesystem is
read-only/ephemeral, so admin publish in prod fails or is lost on redeploy.

Constraints (from the founder):
- Internal/trusted admins only, but they **cannot push to the codebase**. The
  management path must be UI -> DB, never git.
- Serious product, target 10k+ users. Build the real system.
- No iframes (bad for latency and control).
- Keep current render quality (real bundled React, instant prop tweaks).
- Improve the preview sizing system.

## Decision

- **Storage:** Supabase `components` table is source of truth. Thumbnails and
  compiled modules in Supabase Storage.
- **Render (chosen D):** at publish time, an edge/serverless function compiles
  the uploaded `.tsx` to an ESM module, stored content-hashed in Storage. The
  website `import()`s that module into the real React tree (no iframe). Props
  are real React state -> zero-latency tweaks, identical to today.
- **MCP:** reads source from DB, transforms per stack, returns text. No render.
- **Framer:** admin pastes `framer_module_url` into a DB field. Unchanged.
- **Preview sizing:** per-surface layout config moves from the hardcoded
  `COMPONENT_PREVIEW` map in `apps/web/lib/preview.ts` into DB columns the admin
  edits, with an auto-default (center small components, fill large ones).

---

## Data model

`public.components`
| column | type | note |
|---|---|---|
| id | uuid pk | |
| slug | text unique | component id |
| display_name | text | |
| category | text | hero/navbar/pricing/cards/forms/animation/data |
| description | text | |
| description_paragraphs | text[] | |
| key_features | text[] | |
| tags | text[] | |
| dependencies | text[] | npm packages |
| tweak_schema | jsonb | property controls (drives TweakPanel) |
| variants | text[] | |
| premium | bool | |
| source | text | raw .tsx (MCP serves this) |
| compiled_module_url | text | Storage URL, content-hashed, immutable |
| compiled_module_hash | text | |
| compile_status | text | pending \| compiling \| ready \| error |
| compile_error | text | esbuild message, surfaced to admin |
| thumbnail_url | text | Storage |
| framer_module_url | text | |
| preview_layout | jsonb | per-surface: gallery/detail/variant -> {minHeight, fill, center, aspectRatio, paddingX, paddingY, propsOverride} |
| preview_accent | text | |
| related | text[] | slugs |
| status | text | draft \| published \| archived |
| created_by | uuid | admin user |
| created_at / updated_at / published_at | timestamptz | |

Stats stay in the existing `component_stats` table. RLS: read published rows
public; write restricted to admins (role check, same pattern as api_keys).

Storage buckets: `component-modules` (immutable, public read, content-hashed
filenames), `component-thumbnails` (like the existing `avatars` bucket).

---

## Flows

### Publish / compile (publish-time, where the work happens)
```
Admin panel ── upload .tsx + meta ──▶ POST /api/admin/components
                                        │
                                        ├─ validate: parses? default export? has property controls?
                                        ├─ upsert row (status=draft, compile_status=pending)
                                        ├─ compile job (esbuild):
                                        │     tsx -> ESM, react/react-dom/jsx-runtime EXTERNAL,
                                        │     bundle all other deps, content-hash output
                                        │      ├─ ok    ─▶ upload module to Storage (immutable URL)
                                        │      │           row: compiled_module_url, compile_status=ready
                                        │      └─ error ─▶ compile_status=error, compile_error=<msg>
                                        │                  surface to admin, BLOCK publish
                                        └─ admin clicks Publish (only enabled when ready)
                                              ─▶ status=published, revalidateTag(component)
```

### Render (website, no iframe, real React tree)
```
/components/[slug] (server) ─▶ SELECT row (ISR cached) ─▶ client gets
                               compiled_module_url + tweak_schema + preview_layout
<DynamicComponent>:
   import map in <head>: react, react-dom, react/jsx-runtime
        ─▶ host-exposed ESM shims  (SINGLE React instance — critical)
   const Mod = await import(compiled_module_url)   ◀── CDN-cached, immutable
   render <Mod.default {...props} /> inside <PreviewErrorBoundary> + preview frame
   prop tweak ─▶ React setState ─▶ re-render   (zero latency, real React)
```

### MCP (unchanged shape, new data source)
```
list_components ─▶ SELECT published FROM components
get_component   ─▶ SELECT source ─▶ transformComponent(stack/styling/ts/tweaks) ─▶ text
```
Instant, always current, no compiled module involved.

---

## Dependency strategy (the fiddly part) — recommended: bundle-all-except-React

esbuild marks `react`, `react-dom`, `react/jsx-runtime` **external** (resolved
at runtime to the host's single React instance via import map). Everything else
(framer-motion, three, etc.) is **bundled into the module**.

Why not esm.sh / CDN externalize: it puts a third-party CDN in the critical
render path. The founder explicitly values control. Bundling deps keeps modules
self-contained and fully under our control; modules are immutable + CDN-cached,
so size is paid once. Trade: three.js-heavy components produce larger modules
(mitigation: size budget + warn at compile).

The one hard rule: **React is never bundled into a component module.** Two React
copies = "invalid hook call." A CI/compile check must assert no bundled React.

---

## Named failure modes (no silent failures)

1. **Compile error** (TS/JSX) -> `compile_status=error`, real esbuild message
   shown to admin, publish blocked. Never silent.
2. **Module fetch fail** at runtime (Storage 404/network) -> PreviewErrorBoundary
   fallback + retry; logged.
3. **React dual-instance** -> invalid hook call. Mitigation: React always
   external + compile-time assertion no React is bundled. #1 landmine.
4. **Component throws** (nil/empty props, bad state) -> per-component error
   boundary; one bad component never takes down the gallery (each tile isolated).
   Shadow paths to trace: nil props, empty tweakState, module-load error.
5. **Oversized module** (three.js) -> size budget; warn admin at compile.
6. **Partial publish** (DB write ok, compile fail) -> status never flips to
   published until `compile_status=ready`. Transactional guard.
7. **Stale ISR** after edit -> `revalidateTag` on publish/update.

---

## Spikes (do first, before building the CMS)

- **SPIKE 1 — runtime loader + React sharing (BLOCKING, ~1 day / CC ~1-2h).**
  Compile ONE existing component with esbuild (react external). Load it via
  import map + dynamic `import()` into the Next app. Render with live tweak
  props. Confirm hooks + framer-motion work on the shared host React. If this
  is not clean, D is in question — reconsider before spending more.
- **SPIKE 2 — dependency externalization (~0.5 day).** Verify a three.js-based
  component (`lightning`) compiles bundle-all-except-react and runs.

## Build phases

0. Spikes 1 + 2.
1. DB schema + Storage buckets + migrations + RLS.
2. Compile pipeline (esbuild fn) + validation + status machine.
3. Admin CRUD UI: upload/update/delete, compile-status + error surfacing,
   per-surface preview-layout editor.
4. Runtime `DynamicComponent` loader; preview frame reads `preview_layout`.
   **Parity gate:** dynamic render must match current bundled render on the
   seeded 10 before cutover.
5. MCP reads DB.
6. Migrate seeded 10 -> DB + compiled modules. Cut over. Retire the
   `packages/library` build-time bundle as the prod render path (keep as a
   local authoring sandbox if useful).
7. Observability: compile success/latency metrics, module-load error rate,
   dashboard; write deferred items to TODOS.

**Effort:** human ~1-1.5 weeks / CC ~half-day to 1 day, dominated by Spike 1,
the compile pipeline, and preview parity.

## Open sub-decisions (recommended, confirm before Phase 1)
- Dependency strategy: **bundle-all-except-React** (control, no third-party CDN).
- Render path: **uniform** — migrate all components to dynamic modules (one code
  path), gated by parity check, rather than keeping two render paths.
- Module storage: **Supabase Storage**, content-hashed, immutable, CDN-cached.
