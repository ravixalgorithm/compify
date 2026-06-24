import type { ReactNode } from "react";
import Link from "next/link";
import { registry } from "@compify/shared";
import { FramerModuleList } from "@/components/FramerModuleList";
import { FRAMER_MODULE_URL_EXAMPLE } from "@/lib/framer";

const STEPS = [
  {
    title: "Copy the module URL",
    body: "Open any component page and click Copy Framer URL — or grab it from the table below once published.",
  },
  {
    title: "Paste on your Framer canvas",
    body: "In Framer, paste the URL on the canvas (or use Insert → from link). The component drops in as a code component.",
  },
  {
    title: "Tweak in the property panel",
    body: "Every Compify component ships with Framer property controls. Adjust colors, copy, and layout without touching code.",
  },
];

const FAQ = [
  {
    q: "What is a Framer module URL?",
    a: "A hosted link (framer.com/m/…) that points to a code component we publish on Framer. Paste it on the canvas to insert the component — no manual file copy.",
  },
  {
    q: "How is this different from Copy to Framer?",
    a: "Module URLs are one-click insert. Copy to Framer (source paste) is the fallback when a component is not yet hosted — paste the .tsx into a new code component.",
  },
  {
    q: "Why does a component say “Publishing soon”?",
    a: "We add the framer.com/m/ URL in admin after hosting the component on Framer. Until then, use Copy to Framer on the component page for the full source.",
  },
  {
    q: "Do previews match what I get in Framer?",
    a: "Yes. The website preview, Framer module, and MCP delivery all use the same source from packages/library — Framer-safe by spec.",
  },
];

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
          <p className="text-base leading-[24px] tracking-[-0.48px] text-[#999]">{description}</p>
        ) : null}
      </div>
      {children ? <div className="mt-5">{children}</div> : null}
    </section>
  );
}

export function FramerDocs() {
  const framerEntries = registry.filter((entry) => entry.variants.includes("framer"));

  return (
    <div className="font-[family-name:var(--font-roboto-mono)] -mx-6 -my-6 min-h-[calc(100vh-12px)] bg-[#111] px-6 pb-12 pt-[70px] sm:-mx-10 sm:-my-10 sm:px-10 lg:px-[200px]">
      <div className="mx-auto w-full max-w-[1042px]">
        <header className="pb-8">
          <h1 className="text-display font-medium leading-10 tracking-[-0.96px] text-white">
            Framer Integration
          </h1>
          <p className="mt-3 text-base leading-[24px] tracking-[-0.48px] text-[#999]">
            Compify UI components are hosted on Framer as code modules. Each component gets a{" "}
            <span className="text-white">framer.com/m/</span> URL you can share — designers paste
            it on the canvas and get production-ready UI with property controls, no file juggling.
          </p>
        </header>

        <Divider />

        <Section
          id="overview"
          title="How it works"
          description="We publish each registry component to Framer and attach the module URL to the marketplace. You browse, copy the link, and insert on canvas."
        >
          <div className="border border-[#2b2b2b] bg-[#161616] px-4 py-3">
            <p className="text-xs tracking-[-0.36px] text-[#999]">Module URL format</p>
            <p className="mt-1 text-sm tracking-[-0.42px] text-white">{FRAMER_MODULE_URL_EXAMPLE}</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.title} className="border border-[#2b2b2b] bg-[#161616] p-4">
                <p className="text-sm font-medium tracking-[-0.42px] text-white">{step.title}</p>
                <p className="mt-2 text-xsm leading-[20px] tracking-[-0.39px] text-[#999]">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </Section>

        <Divider />

        <Section
          id="modules"
          title="Component module URLs"
          description="Published components appear here with a copy button. Open the component page for live preview and Copy Framer URL."
        >
          <FramerModuleList entries={framerEntries} />
        </Section>

        <Divider />

        <Section
          id="fallback"
          title="Before a module is live"
          description="Not every component has a hosted URL yet. Until admin adds the Framer link, use source copy from the component page."
        >
          <div className="border border-[#2b2b2b] bg-[#161616] px-4 py-3 text-xsm leading-[20px] tracking-[-0.39px] text-[#999]">
            <p>
              <span className="text-white">Copy to Framer</span> on any component page copies the
              full .tsx source plus comments for non-default props. Paste into{" "}
              <span className="text-white">Insert → Code → New Component</span> in Framer.
            </p>
            <p className="mt-3">
              Need MCP instead? See{" "}
              <Link href="/connect" className="text-white underline-offset-2 hover:underline">
                MCP Integrations
              </Link>
              .
            </p>
          </div>
        </Section>

        <Divider />

        <Section
          id="spec"
          title="Framer-safe by spec"
          description="Every component in the library is authored for Framer first — same rules apply whether you use a module URL or paste source."
        >
          <ul className="space-y-2 text-xsm leading-[20px] tracking-[-0.39px] text-[#999]">
            <li>
              <span className="text-white">Default export</span> — Framer picks up{" "}
              <code className="text-white">export default function</code>
            </li>
            <li>
              <span className="text-white">Property controls</span> — tweak panel on canvas matches
              the website tweak panel
            </li>
            <li>
              <span className="text-white">framer-motion</span> — all animation; no CSS keyframes
            </li>
            <li>
              <span className="text-white">Layout annotations</span> —{" "}
              <code className="text-white">@framerSupportedLayoutWidth/Height</code> on every
              component
            </li>
          </ul>
        </Section>

        <Divider />

        <Section id="troubleshooting" title="FAQ">
          <div className="space-y-3">
            {FAQ.map((item, index) => (
              <div
                key={item.q}
                className={`border border-[#2b2b2b] px-4 py-3 ${index % 2 === 0 ? "bg-[#111]" : "bg-[#161616]"}`}
              >
                <p className="text-sm font-medium tracking-[-0.42px] text-white">{item.q}</p>
                <p className="mt-2 text-xsm leading-[20px] tracking-[-0.39px] text-[#999]">
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
