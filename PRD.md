# Compify UI — Product Requirements Document

**Version:** 1.0
**Date:** June 2026
**Status:** Draft · Confidential

---

## Table of Contents

1. [Overview & Vision](#1-overview--vision)
2. [Problem Statement](#2-problem-statement)
3. [Target Users](#3-target-users)
4. [Product Architecture](#4-product-architecture)
5. [Marketplace Website](#5-marketplace-website)
6. [Component Page & Tweak Panel](#6-component-page--tweak-panel)
7. [MCP Server](#7-mcp-server)
8. [Component Library Spec](#8-component-library-spec)
9. [Copy & Delivery Flows](#9-copy--delivery-flows)
10. [Tech Stack](#10-tech-stack)
11. [Build Phases](#11-build-phases)
12. [Success Metrics](#12-success-metrics)
13. [Open Questions](#13-open-questions)

---

## 1. Overview & Vision

Compify UI is a component marketplace and MCP delivery layer for Framer builders and React developers. It provides production-ready custom code components that work in Framer out of the box, with a live tweak panel on the web, plus an MCP server that lets developers pull and customize components directly inside Claude Code, Cursor, or any MCP-compatible editor.

**The platform serves two audiences in one product:**

- **Designers** use the website to browse, preview, tweak, and copy components into Framer.
- **Developers** use the MCP to get components delivered directly into their project — stack-aware, dependency-installed, import-ready.

Compify UI is not a copy-paste library. The MCP layer means a developer can describe what they want in plain English and get a working, Framer-safe React component placed in the right file in their project. The website means a designer can tweak every variable visually before committing to a component.

---

## 2. Problem Statement

| Pain Point | How Compify UI Solves It |
|---|---|
| Framer custom code components are scattered across Twitter, GitHub gists, and paid Gumroad products with no central discovery. | Single marketplace with search, categories, tags, and live preview. |
| Copy-pasted components break in Framer — wrong exports, missing `addPropertyControls`, incompatible APIs. | Every component is Framer-safe by spec. MCP system prompt enforces constraints on generated components. |
| Developers building in React or Next.js cannot use Framer-specific component sources. | MCP detects tech stack and serves the right variant — Framer, plain React, Next.js, Vite. |
| No way to preview or tweak components before committing to them. | Live tweak panel on every component page — see changes in real time before copying. |
| Getting a component into a project requires manual steps: find, copy, paste, install deps, fix imports. | MCP handles all of that. One prompt → component in the right file, deps installed. |

---

## 3. Target Users

### Primary — Framer Designers & No-Code Builders
- Use Framer as their primary design + publish tool.
- Want drop-in custom code components with visible controls.
- Comfort level: copy-paste. No terminal, no npm.
- **Success metric:** component works first try in Framer.

### Secondary — React / Next.js Developers
- Building production apps, not in Framer.
- Use Claude Code, Cursor, or Windsurf as their editor.
- Want components that match their stack and styling system.
- **Success metric:** component generated, deps installed, import added — zero friction.

### Tertiary — Framer Agency Developers
- Build Framer sites for clients at scale.
- Need components that are reliable, customizable, and maintainable.
- Want MCP access to speed up per-project customization.

---

## 4. Product Architecture

Three distinct layers sharing a single component registry:

| Layer | What It Is | Who Uses It |
|---|---|---|
| **Marketplace Website** | Browse, preview, tweak, copy components | Framer designers, all users |
| **MCP Server** | Tool-based delivery into editors — generates and serves stack-aware component code | React devs, Framer agency devs |
| **Component Registry** | `registry.json` + component `.tsx` source files — single source of truth for both layers | Powers website and MCP |

### Monorepo Structure

```
compify-ui/
├── packages/
│   ├── library/          → Component .tsx source files
│   ├── mcp-server/       → MCP tool server (Hono + @modelcontextprotocol/sdk)
│   └── shared/           → Framer constraint rules, theme tokens, registry types
├── apps/
│   └── web/              → Marketplace website (Next.js 14)
└── registry.json         → Component metadata index
```

---

## 5. Marketplace Website

### 5.1 Dashboard / Browse Page

The main entry point. All components listed with filtering and search.

**Layout:**
- Top nav: Logo, search bar, categories filter, sign in
- Left sidebar: category tree (Hero, Navbar, Pricing, Cards, Forms, Animations, Data Display)
- Main grid: component cards — thumbnail preview, name, category tag, copy count
- Each card: hover shows a live mini-preview (component renders in an iframe)

**Filtering:**
- By category
- By tag (`glassmorphism`, `dark`, `animated`, `minimal`, etc.)
- By stack compatibility (Framer, React, Next.js)
- Free vs premium

### 5.2 Component Card

| Element | Description |
|---|---|
| Preview thumbnail | Static screenshot or animated GIF of the component |
| Name + category | e.g. "Pricing Card · Cards" |
| Tags | `dark`, `glassmorphism`, `framer-motion`, etc. |
| Copy count | Social proof — how many times copied |
| Quick copy button | Copy to Framer without opening the component page |

---

## 6. Component Page & Tweak Panel

### 6.1 Layout

```
┌──────────────────────────────────────────────────────────┐
│  Compify UI  /  Cards  /  Pricing Card                   │
│                                    [Copy to Framer]       │
│                                    [Copy to Claude Code]  │
├───────────────────────────┬──────────────────────────────┤
│                           │  TWEAK PANEL                 │
│                           │  ───────────────────         │
│      LIVE PREVIEW         │  Theme      [Dark ▾]         │
│                           │  Accent     [● #7C3AED]      │
│   [component renders      │  Tiers      [3      ]        │
│    here in iframe]        │  Badge      [On  ●──]        │
│                           │  Radius     [──●── 12px]     │
│   [Desktop/Tablet/Mobile] │                              │
│                           │  [Reset defaults]            │
├───────────────────────────┴──────────────────────────────┤
│  Description · Props · Dependencies · Usage              │
└──────────────────────────────────────────────────────────┘
```

### 6.2 Live Preview

- Component renders inside a sandboxed iframe.
- Preview updates in real time as the user adjusts tweak panel controls — no save/apply step.
- Viewport switcher resizes the iframe: Desktop (1280px) / Tablet (768px) / Mobile (375px).
- Dark mode toggle for components that support it.

### 6.3 Tweak Panel

The tweak panel exposes the component's variables as interactive controls. This is a pure React UI on the website — not Framer property controls. State changes are sent to the preview iframe via `postMessage`.

**Control types:**

| Control | Used for | Example |
|---|---|---|
| Color picker | Brand colors, accents, backgrounds | Accent Color: `#7C3AED` |
| Dropdown / Enum | Theme variants, layout options | Theme: Light / Dark / Glass |
| Toggle / Boolean | Show/hide elements | Show Badge: On / Off |
| Slider / Number | Border radius, spacing, animation duration | Border Radius: 12px |
| Text input | Labels, headings, CTA text | Tier name: "Pro" |

Each component in the registry ships with a `tweakSchema` — a JSON definition of which controls appear in the panel and their default values. The website reads this schema and renders controls dynamically.

### 6.4 Copy Buttons

Two primary actions, always visible at the top of the tweak panel:

**Copy to Framer**
- Generates a Framer remix URL or triggers a `framer://` deep link with the component pre-loaded.
- Framer opens a new project with the component ready on canvas.
- The copied component reflects the user's current tweak state.

**Copy to Claude Code / Cursor / Codex**
- Copies a natural language prompt to clipboard that encodes the component name and tweak state.
- Example prompt copied:
  ```
  Using compify-ui MCP, get me the pricing-card component,
  dark theme, accent #7C3AED, 3 tiers, badge enabled
  ```
- User pastes this into Claude Code chat. Claude calls the MCP tool. Component is placed in the project.
- The component in their editor matches exactly what they saw in the tweak panel.

### 6.5 Below the Preview

- **Description** — what the component is and what it's for
- **Props table** — all available props with types and defaults
- **Dependencies** — npm packages required (e.g. `framer-motion`, `lucide-react`)
- **Usage snippet** — minimal code example
- **Related components**

---

## 7. MCP Server

### 7.1 What the MCP Server Does

The MCP server is a hosted HTTP server that registers tools with MCP-compatible editors. When a user connects it (one-time setup), Claude Code, Cursor, or Codex gains access to those tools and can call them mid-conversation to fetch or generate components.

The server is intentionally thin — it mostly serves component code from the registry, with one AI call for generation or customization.

### 7.2 One-Time Connection Setup

Users connect the MCP once. After that, the entire library is accessible via natural language in their editor.

**Claude Code:**
```bash
claude mcp add compify-ui --url https://mcp.compify.ui/mcp
```

**Cursor / Windsurf** — paste into `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "compify-ui": {
      "url": "https://mcp.compify.ui/mcp"
    }
  }
}
```

The website's "Copy to Claude Code" button copies the correct config snippet for the user's editor.

### 7.3 MCP Tools

| Tool | Parameters | What It Does |
|---|---|---|
| `list_components` | `category?` (string) | Returns component index from registry. Claude uses this to find the right component or show what's available. |
| `get_component` | `name` (string), `stack?` (framer \| react \| nextjs \| vite), `styling?` (css \| tailwind \| cssmodules), `typescript?` (bool) | Returns component source code. Stack and styling params let Claude pass project context so the right variant is served. |
| `generate_component` | `prompt` (string), `baseComponent?` (string), `stack?`, `styling?`, `typescript?` | Generates a new or customized component using Claude API with the Framer constraint system prompt. Returns source code. |
| `redesign_component` | `code` (string), `instructions` (string), `stack?` | Takes existing component code + instructions → returns redesigned version. Claude Code reads the file and passes the code. |

### 7.4 The Framer Constraint System Prompt

This is the core IP of the MCP layer. Every `generate_component` and `redesign_component` call wraps the user prompt with a system prompt that encodes Framer-safe rules:

```
You are an expert Framer component developer. Generate React components
that are 100% compatible with Framer's custom code environment.

HARD RULES:
- Always use `export default function ComponentName(props)`
- Always import { addPropertyControls, ControlType } from "framer"
- Always call addPropertyControls() at the bottom with sensible controls
- Use framer-motion for all animations — never CSS keyframes or transitions
- Never use useEffect with window/document without typeof window !== 'undefined' guard
- Never use Next.js or SSR-specific APIs
- All props must have TypeScript types and default values
- Use inline styles only — no Tailwind, no CSS modules (unavailable in Framer)
- Output only the component code, no explanation, no markdown fences
```

The system prompt grows over time as new edge cases are discovered. This accumulated rule set is the moat — it's what makes every generated component work first try in Framer.

### 7.5 Stack Detection Flow

Claude Code reads the user's project and passes context when calling `get_component` or `generate_component`:

1. Claude Code detects: `package.json` → Next.js 14, `tailwind.config.js` → Tailwind, `tsconfig.json` → TypeScript.
2. Calls `get_component({ name: "pricing-card", stack: "nextjs", styling: "tailwind", typescript: true })`.
3. MCP server selects or generates the appropriate variant.
4. Returns code. Claude Code writes to the correct file, runs `npm install` for missing deps, adds import.

### 7.6 Per-Component Prompt from Website

When a user clicks "Copy to Claude Code" on a component page, the copied prompt encodes their tweak state:

```
Using compify-ui MCP, get me the pricing-card component,
dark theme, accent #7C3AED, 3 tiers, badge enabled
```

Claude Code receives this, calls `generate_component` with these params, and returns a component that exactly matches what the user saw on the website.

---

## 8. Component Library Spec

### 8.1 What Makes a Component Framer-Safe

- `export default function` — not a named export
- `addPropertyControls` defined for every prop — enables Framer sidebar controls
- `framer-motion` for all animations
- No `window` or `document` access without SSR guard
- No external API calls inside the component
- All dependencies are npm packages — no CDN scripts

### 8.2 Registry Schema (`registry.json`)

Each entry in `registry.json`:

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Slug identifier, e.g. `"pricing-card"` |
| `displayName` | `string` | Human-readable, e.g. `"Pricing Card"` |
| `category` | `string` | `hero \| navbar \| pricing \| cards \| forms \| animation \| data` |
| `tags` | `string[]` | e.g. `["dark", "glassmorphism", "framer-motion"]` |
| `dependencies` | `string[]` | npm packages required, e.g. `["framer-motion", "lucide-react"]` |
| `tweakSchema` | `TweakControl[]` | JSON definition of website tweak panel controls |
| `variants` | `string[]` | `["framer", "react", "nextjs"]` — which stack variants exist |
| `premium` | `boolean` | Free or paid |
| `previewPath` | `string` | Path to preview image/gif for dashboard card |

### 8.3 TweakSchema Shape

```ts
type TweakControl = {
  key: string               // prop name on the component
  label: string             // label shown in panel
  type: 'color' | 'enum' | 'boolean' | 'number' | 'string'
  options?: string[]        // for enum type
  default: any
  min?: number              // for number type
  max?: number
}
```

### 8.4 Launch Component Set (V1 — 20 components)

| Category | Components |
|---|---|
| **Hero** | Full-screen hero, Split hero, Animated gradient hero |
| **Navbar** | Sticky navbar, Mobile hamburger nav, Transparent-to-solid scroll nav |
| **Pricing** | 2-tier card, 3-tier card, Monthly/annual toggle pricing |
| **Cards** | Feature card, Testimonial card, Team member card, Stats card |
| **Forms** | Contact form, Newsletter subscribe, Waitlist signup |
| **Animation** | Scroll reveal wrapper, Stagger list, Floating badge |

---

## 9. Copy & Delivery Flows

### 9.1 Copy to Framer Flow

1. User opens component page, tweaks settings in tweak panel.
2. Clicks **Copy to Framer**.
3. Website generates a Framer remix URL encoding the component and tweak state.
4. Opens `framer.com/remix/...` or triggers `framer://` deep link.
5. Framer opens a new project with the component on canvas.
6. User drags it into their existing project or copies the code from Framer's code panel.

### 9.2 Copy to Claude Code Flow

1. User opens component page, tweaks settings in tweak panel.
2. Clicks **Copy to Claude Code** (or Cursor, or Codex).
3. Clipboard receives the encoded natural language prompt.
4. User pastes into Claude Code / Cursor chat.
5. Claude Code sees the MCP is connected, identifies the tool call needed.
6. Calls `get_component` or `generate_component` with the encoded params.
7. MCP server detects or receives stack context, returns correct variant.
8. Claude Code writes the file, runs `npm install` for missing deps, adds import.
9. Component is live in the project — matches exactly what the user saw on the website.

### 9.3 MCP-Only Flow (No Website)

For power users who skip the website entirely:

1. User types in Claude Code: *"give me a dark glassmorphism hero section with a CTA button"*.
2. Claude Code calls `list_components` to find relevant options, or calls `generate_component` directly.
3. MCP serves or generates the component with Framer constraint rules applied.
4. Claude Code places the file in the project, installs deps, adds import.

---

## 10. Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Marketplace website | Next.js 14 (App Router) | SSR for SEO, RSC for fast component pages |
| Component previews | Sandboxed iframe with live React render | Safe isolation, real component rendering |
| Tweak panel | React state + `postMessage` to iframe | No extra framework, instant updates |
| MCP server | Hono + `@modelcontextprotocol/sdk` | Lightweight, edge-deployable, official SDK |
| Component generation | Anthropic API (`claude-sonnet-4-6`) | Best code generation, Framer constraint adherence |
| Component storage | Git repo + `registry.json` | Version controlled, no DB needed for V1 |
| MCP hosting | Railway or Fly.io | Simple deploy, low ops overhead |
| Auth (V2) | Clerk or Supabase Auth | For premium components and MCP API keys |
| Website styling | Tailwind CSS + shadcn/ui | For the website UI — not the components themselves |

---

## 11. Build Phases

### Phase 1 — Foundation (Weeks 1–2)
**Goal: MCP server working end-to-end with 3 components.**

- Set up monorepo (pnpm workspaces).
- Build 3 components manually (hero, pricing card, navbar) — written to Framer spec.
- Create `registry.json` with their metadata.
- Build MCP server: `list_components` + `get_component` tools only.
- Deploy to Railway. Test in Claude Code.
- Document every Framer constraint rule discovered while building the 3 components.

### Phase 2 — Marketplace Website (Weeks 3–4)
**Goal: Public website live with browse + component pages.**

- Dashboard page with component grid and filtering.
- Component page layout: preview iframe + tweak panel + copy buttons.
- Tweak panel reads `tweakSchema` from registry, renders controls dynamically.
- Preview iframe renders component with prop changes via `postMessage`.
- "Copy to Framer" button with Framer remix URL.
- "Copy prompt" button that encodes component + tweak state.

### Phase 3 — Component Library (Weeks 5–6)
**Goal: 20 components covering 6 categories.**

- Build remaining 17 components to Framer spec.
- Each component gets full `tweakSchema`, `addPropertyControls`, framer-motion animations.
- Add Framer remix URLs for each.
- Add stack variants (plain React) for top 5 most-used components.

### Phase 4 — Generate & Redesign Tools (Weeks 7–8)
**Goal: MCP can generate and customize, not just fetch.**

- `generate_component` tool: Framer system prompt + Claude API.
- `redesign_component` tool: accepts existing code + instructions.
- Stack detection integration: MCP reads stack params from Claude Code context.
- Iterate system prompt until 9/10 generated components work first try in Framer.

### Phase 5 — Monetization & Auth (Weeks 9–10)
**Goal: Revenue infrastructure in place.**

- Auth (Clerk) — accounts for premium access.
- MCP API key system — keys tied to accounts, passed in MCP config.
- Premium component tier — paywalled in website and MCP.
- Stripe integration for subscriptions.

---

## 12. Success Metrics

| Metric | Week 4 Target | Week 10 Target |
|---|---|---|
| Components in library | 5 | 30+ |
| MCP connections | 25 | 500+ |
| Component copies / week | 100 | 2,000+ |
| First-try Framer success rate (generated) | 70% | 90%+ |
| Paid subscribers | 0 (free only) | 50+ |

---

## 13. Open Questions

| Question | Decision Needed By |
|---|---|
| Does Framer's API support remix URLs publicly, or do we need a workaround for "Copy to Framer"? | Before Phase 2 |
| Monetization model — subscription vs per-component vs freemium? | Before Phase 5 |
| Component variants — build all stack variants upfront, or generate on demand via MCP? | Before Phase 3 |
| Community contributions — allow third-party component submissions in V2? | V2 planning |
| MCP API key distribution — per-user keys or a single shared key for free tier? | Before Phase 5 |

---

*Compify UI · PRD v1.0 · June 2026 · Confidential*
