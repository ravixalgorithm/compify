import type { ReactNode } from "react";
import Link from "next/link";
import { ConnectClient } from "@/components/ConnectClient";
import { cn } from "@/lib/cn";
import { mcpDocs } from "@/lib/mcp-docs-surface";
import { MCP_URL_PROD } from "@/lib/mcp";

const TOOLS = [
  {
    name: "list_components",
    summary: "Returns the component index from the registry. Filter by category when needed.",
    highlight: false,
  },
  {
    name: "get_component",
    summary:
      "Returns source for a registry component, adapted to your stack (framer, react, nextjs, vite) with optional tweak values.",
    highlight: false,
  },
];

const EXAMPLES = [
  { goal: "Browse catalog", prompt: "List all hero components from compify-ui" },
  { goal: "Fetch for Framer", prompt: "Get the pricing-three-tier component from compify-ui" },
  { goal: "Fetch for Next.js", prompt: "Get newsletter-form from compify-ui for Next.js with Tailwind" },
  { goal: "With tweaks", prompt: "Using compify-ui MCP, get me pricing-three-tier, dark theme, accent #7C3AED" },
];

const FAQ = [
  {
    q: "MCP not showing in editor",
    a: "Restart the editor after adding config. Confirm the URL ends with /mcp.",
  },
  {
    q: "401 Unauthorized",
    a: "Pass a valid key as 'Authorization: Bearer <key>'. Create or replace one at Profile → API Keys.",
  },
  {
    q: "Unknown component name",
    a: "Use the registry slug (pricing-three-tier), not the display name. Run list_components to see all slugs.",
  },
  {
    q: "Preview doesn't match delivered code",
    a: "Copy the prompt from the website after tweaking — it encodes non-default prop values. Or pass tweaks explicitly in get_component.",
  },
];

function InfoBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={cn(mcpDocs.card, "px-4 py-3")}>
      <p className={mcpDocs.label}>{label}</p>
      <div className={cn("mt-1", mcpDocs.body)}>{children}</div>
    </div>
  );
}

function Divider() {
  return <div className="h-px w-full shrink-0 bg-[#2b2b2b]" aria-hidden />;
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 py-8">
      <div className="flex flex-col gap-3">
        <h2 className="text-title font-medium leading-[26px] tracking-[-0.66px] text-white">{title}</h2>
        {description ? (
          <p className="text-base leading-[24px] tracking-[-0.48px] text-[#b8b8b8]">{description}</p>
        ) : null}
      </div>
      {children ? <div className="mt-5">{children}</div> : null}
    </section>
  );
}

function ToolsTable({
  rows,
}: {
  rows: { name: string; summary: string; highlight?: boolean }[];
}) {
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex min-w-[640px] border border-[#2b2b2b] bg-[#1a1a1a] px-4 py-2.5 text-sm font-medium tracking-[-0.36px] text-[#b8b8b8]">
        <span className="w-[200px] shrink-0">Tool</span>
        <span className="min-w-0 flex-1">What it does</span>
      </div>
      {rows.map((row, index) => (
        <div
          key={row.name}
          className={cn(
            "flex min-w-[640px] border border-t-0 border-[#2b2b2b] px-4 py-3 text-sm tracking-[-0.39px]",
            index % 2 === 0 ? "bg-bg" : "bg-[#161616]",
          )}
        >
          <span
            className={cn(
              "w-[200px] shrink-0 font-medium",
              row.highlight ? "text-[#fa7319]" : "text-white",
            )}
          >
            {row.name}
          </span>
          <span className="min-w-0 flex-1 leading-[20px] text-[#b8b8b8]">{row.summary}</span>
        </div>
      ))}
    </div>
  );
}

export function McpDocs() {
  return (
    <div className="font-[family-name:var(--font-roboto-mono)] -mx-6 -my-6 min-h-[calc(100vh-12px)] bg-bg px-6 pb-12 pt-[70px] sm:-mx-10 sm:-my-10 sm:px-10 lg:px-12 xl:px-20 2xl:px-[120px]">
      <div className="mx-auto w-full max-w-[1042px]">
        <header className="pb-8">
          <h1 className="text-display font-medium leading-10 tracking-[-0.96px] text-white">
            MCP Server
          </h1>
          <p className="mt-3 text-base leading-[24px] tracking-[-0.48px] text-[#b8b8b8]">
            The official Model Context Protocol server for Compify UI. Plug the component
            registry into Claude Code, Codex, Cursor, and any MCP-compatible editor —
            then fetch, customize, or generate Framer-safe components through natural language.
          </p>
        </header>

        <Divider />

        <Section
          id="overview"
          title="What is the MCP server?"
          description="The Compify UI MCP server exposes two tools — list_components and get_component — so any agent that speaks MCP can browse the marketplace registry and deliver production-ready code. The server runs on a hosted endpoint and serves the same components you preview on the website."
        >
          <InfoBlock label="Hosted HTTP endpoint — connect once, no local install step">
            {MCP_URL_PROD}
          </InfoBlock>
        </Section>

        <Divider />

        <Section
          id="quick-start"
          title="Install in your agent"
          description="Find your editor below, copy the config, and restart the client."
        >
          <ConnectClient />
          <p className="mt-6 text-base leading-[24px] tracking-[-0.48px] text-[#b8b8b8]">
            After connecting, open any component page, tweak props, and click{" "}
            <span className="text-white">Copy</span>. Paste the prompt into your editor — the model
            calls MCP and delivers the file with dependencies installed.
          </p>
          <div className="mt-4">
            <InfoBlock label="Example prompt">
              Using compify-ui MCP, get me the pricing-three-tier component, dark theme, accent
              #7C3AED, 3 tiers, badge enabled.
            </InfoBlock>
          </div>
        </Section>

        <Divider />

        <Section id="tools" title="Tools exposed">
          <ToolsTable rows={TOOLS} />
          <div className={cn(mcpDocs.card, "mt-5 p-4 text-sm leading-[22px] tracking-[-0.39px] text-[#b8b8b8]")}>
            <p className="text-base font-medium text-white">Stack behavior</p>
            <ul className="mt-3 space-y-1.5">
              <li>
                <span className="text-white">framer</span> — use hosted module URLs from the{" "}
                <Link href="/framer" className="text-white underline-offset-2 hover:underline">
                  Framer Integration
                </Link>{" "}
                docs, or paste source via Copy to Framer
              </li>
              <li>
                <span className="text-white">react</span> / <span className="text-white">vite</span>{" "}
                — Framer bindings stripped
              </li>
              <li>
                <span className="text-white">nextjs</span> — same as react, plus &ldquo;use
                client&rdquo;
              </li>
            </ul>
          </div>
        </Section>

        <Divider />

        <Section
          id="workflows"
          title="Workflows"
          description="Two ways to use the server — from the website with tweak panel state, or directly from your editor."
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <div className={cn(mcpDocs.card, "p-4")}>
              <p className="text-base font-medium tracking-[-0.42px] text-white">
                From the website
              </p>
              <ol className="mt-3 list-inside list-decimal space-y-2 text-sm leading-[22px] tracking-[-0.39px] text-[#b8b8b8]">
                <li>Open a component page</li>
                <li>Tweak props in the panel</li>
                <li>Copy prompt and paste into editor</li>
                <li>Model calls MCP → file lands in your project</li>
              </ol>
            </div>
            <div className={cn(mcpDocs.card, "p-4")}>
              <p className="text-base font-medium tracking-[-0.42px] text-white">
                From the editor only
              </p>
              <p className="mt-3 text-sm leading-[22px] tracking-[-0.39px] text-[#b8b8b8]">
                No website required. Ask your editor to list, fetch, or generate components directly
                through the MCP tools. Pass stack context from your package.json — nextjs + tailwind
                for Next.js projects, framer for Framer canvas delivery.
              </p>
            </div>
          </div>
        </Section>

        <Divider />

        <Section id="examples" title="Example prompts">
          <ToolsTable
            rows={EXAMPLES.map((row) => ({
              name: row.goal,
              summary: row.prompt,
            }))}
          />
        </Section>

        <Divider />

        <Section id="troubleshooting" title="Troubleshooting">
          <div className="space-y-3">
            {FAQ.map((item, index) => (
              <div
                key={item.q}
                className={cn(
                  "border border-[#2b2b2b] px-4 py-3",
                  index % 2 === 0 ? "bg-bg" : "bg-[#161616]",
                )}
              >
                <p className="text-base font-medium tracking-[-0.42px] text-white">{item.q}</p>
                <p className="mt-2 text-sm leading-[22px] tracking-[-0.39px] text-[#b8b8b8]">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
