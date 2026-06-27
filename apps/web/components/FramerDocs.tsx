import type { ReactNode } from "react";
import Link from "next/link";
import { EditorIconStack } from "@/components/EditorIconStack";

const STEPS = [
  {
    title: "Open a component",
    body: "Browse the library and open any component for a live preview of exactly what you'll get.",
  },
  {
    title: "Copy to Framer",
    body: "Click Copy to Framer on the component page. The full component source is copied to your clipboard.",
  },
  {
    title: "Paste & customize",
    body: "In Framer, choose Insert → Code → New Component and paste. Adjust colors, copy, and layout in the property panel — no code required.",
  },
];

const FAQ = [
  {
    q: "How do I add a component to Framer?",
    a: "Open any component page, click Copy to Framer, then in Framer choose Insert → Code → New Component and paste. The component drops onto your canvas ready to use.",
  },
  {
    q: "Do I need to write any code?",
    a: "No. Every component ships with Framer property controls, so you can change colors, text, and layout directly in the property panel.",
  },
  {
    q: "Will it look like the preview?",
    a: "Yes. The preview on the website and the component you paste into Framer render from the exact same source.",
  },
  {
    q: "Can I use these with AI tools or MCP?",
    a: "Yes. The same components are available over MCP — see the MCP Integrations page to connect your editor or agent.",
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

export function FramerDocs() {
  return (
    <div className="font-[family-name:var(--font-roboto-mono)] -mx-6 -my-6 min-h-[calc(100vh-12px)] bg-bg px-6 pb-12 pt-[70px] sm:-mx-10 sm:-my-10 sm:px-10 lg:px-12 xl:px-20 2xl:px-[120px]">
      <div className="mx-auto w-full max-w-[1042px]">
        <header className="pb-8">
          <h1 className="text-display font-medium leading-10 tracking-[-0.96px] text-white">
            Framer Integration
          </h1>
          <p className="mt-3 text-base leading-[24px] tracking-[-0.48px] text-[#b8b8b8]">
            Compify UI components are built for Framer. Copy any component and paste it onto your
            canvas as a code component — production-ready UI with property controls, no setup.
          </p>
        </header>

        <Divider />

        <Section
          id="overview"
          title="How it works"
          description="Browse the library, copy the component you want, and paste it into Framer. Customize everything from the property panel."
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
          id="copy"
          title="Copy to Framer"
          description="The fastest way in — copy a component and paste it straight onto your canvas."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="border border-[#2b2b2b] bg-[#161616] p-4">
              <p className="text-base font-medium tracking-[-0.42px] text-white">Copy</p>
              <p className="mt-2 text-sm leading-[22px] tracking-[-0.39px] text-[#b8b8b8]">
                <span className="text-white">Copy to Framer</span> on any component page copies the
                full component source, with sensible defaults already set.
              </p>
            </div>
            <div className="border border-[#2b2b2b] bg-[#161616] p-4">
              <p className="text-base font-medium tracking-[-0.42px] text-white">Paste &amp; customize</p>
              <p className="mt-2 text-sm leading-[22px] tracking-[-0.39px] text-[#b8b8b8]">
                Paste into{" "}
                <span className="text-white">Insert → Code → New Component</span> in Framer and
                start customizing.
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-[22px] tracking-[-0.39px] text-[#b8b8b8]">
            Prefer to work from{" "}
            <span className="inline-flex -translate-y-px align-middle">
              <EditorIconStack size={22} ringClassName="" />
            </span>
            ? See{" "}
            <Link href="/connect" className="text-white underline underline-offset-2">
              MCP Integrations
            </Link>
            .
          </p>
        </Section>

        <Divider />

        <Section
          id="spec"
          title="Framer-safe by spec"
          description="Every component in the library is authored for Framer first, so it just works when you paste it in."
        >
          <ul className="space-y-2 text-sm leading-[22px] tracking-[-0.39px] text-[#b8b8b8]">
            <li>
              <span className="text-white">Default export</span> — Framer picks up{" "}
              <code className="text-white">export default function</code>
            </li>
            <li>
              <span className="text-white">Property controls</span> — adjust colors, copy, and
              layout from Framer's property panel
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
      </div>
    </div>
  );
}
