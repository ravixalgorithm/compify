import type { ReactNode } from "react";
import Link from "next/link";

const STEPS = [
  {
    title: "Open a component",
    body: "Browse the library and open any component for a live preview of exactly what you'll get.",
  },
  {
    title: "Tweak, then Copy Code",
    body: "Adjust props in the control panel, open the Copy dialog, and pick Copy Code. The full component source lands on your clipboard.",
  },
  {
    title: "Paste into your project",
    body: "Drop the .tsx into your codebase, install any dependencies it imports, and render it like any other component.",
  },
];

const STACKS = [
  {
    name: "framer",
    body: "Paste straight into Insert → Code → New Component. Property controls and layout annotations are already in the source.",
  },
  {
    name: "react / vite",
    body: "Works as a normal component. Framer-only imports resolve to a no-op shim, or fetch the stripped source over MCP for a clean file.",
  },
  {
    name: "nextjs",
    body: 'Same as react, with "use client" at the top for the interactive components.',
  },
];

const FAQ = [
  {
    q: "What exactly gets copied?",
    a: "The complete component source as a single .tsx file. Any props you changed in the preview are captured as a header comment so your customization isn't lost.",
  },
  {
    q: "Do I need an account?",
    a: "Copying is gated behind sign-in and the daily copy quota, the same as the other workflows.",
  },
  {
    q: "Want stack-adapted source instead?",
    a: "Use the MCP server's get_component tool — it returns the same component already adapted to framer, react, nextjs, or vite.",
  },
];

function Divider() {
  return <div className="h-px w-full shrink-0 bg-divider" aria-hidden />;
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

/** Body for the "Code" tab — copy the full component source straight to your project. */
export function CodeDocs() {
  return (
    <>
      <Divider />

      <Section
        id="overview"
        title="How it works"
        description="Copy a component's complete source, paste it into your project, and customize it like any other file — no canvas, no agent."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.title} className="border border-[#2b2b2b] bg-[#161616] p-4">
              <p className="text-base font-medium tracking-[-0.42px] text-white">{step.title}</p>
              <p className="mt-2 text-sm leading-[22px] tracking-[-0.39px] text-[#b8b8b8]">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Divider />

      <Section
        id="stacks"
        title="Use it in your stack"
        description="Every component is authored for Framer first; here's what to expect when you paste the source elsewhere."
      >
        <ul className="space-y-2 text-sm leading-[22px] tracking-[-0.39px] text-[#b8b8b8]">
          {STACKS.map((s) => (
            <li key={s.name}>
              <span className="text-white">{s.name}</span> — {s.body}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm leading-[22px] tracking-[-0.39px] text-[#b8b8b8]">
          Pasting onto a Framer canvas instead? See the{" "}
          <Link href="/integrations?tab=framer" className="text-white underline underline-offset-2 hover:text-white/90">
            Framer
          </Link>{" "}
          tab. Want source adapted to your stack automatically? Connect the{" "}
          <Link href="/integrations?tab=mcp" className="text-white underline underline-offset-2 hover:text-white/90">
            MCP server
          </Link>
          .
        </p>
      </Section>

      <Divider />

      <Section id="faq" title="FAQ">
        <div className="space-y-3">
          {FAQ.map((item, index) => (
            <div
              key={item.q}
              className={`border border-[#2b2b2b] px-4 py-3 ${index % 2 === 0 ? "bg-bg" : "bg-[#161616]"}`}
            >
              <p className="text-base font-medium tracking-[-0.42px] text-white">{item.q}</p>
              <p className="mt-2 text-sm leading-[22px] tracking-[-0.39px] text-[#b8b8b8]">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
