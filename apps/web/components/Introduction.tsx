import type { ReactNode } from "react";
import Link from "next/link";
import { IntroShowcase } from "@/components/IntroShowcase";
import { introShowcaseEntries } from "@/lib/intro-showcase";

const CROSS_PLATFORM = [
  {
    title: "Copy React code.",
    description: "No rebuilding. No recreating animations from scratch.",
  },
  {
    title: "Duplicate components.",
    description: "Keep design and development aligned.",
  },
  {
    title: "Align design, development.",
    description: "Use the same interaction patterns everywhere.",
  },
] as const;

const OPEN_CUSTOMIZABLE = [
  {
    title: "Edit styles and layouts.",
    description: "Customize animations and motion.",
  },
  {
    title: "Customize animations.",
    description: "Adapt components to your design system.",
  },
  {
    title: "Adapt components to system.",
    description: "Extend functionality without limitations.",
  },
] as const;

function Divider() {
  return <div className="h-px w-full shrink-0 bg-[#2b2b2b]" aria-hidden />;
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5 border border-[#2b2b2b] bg-[#161616] p-4">
      <p className="text-base font-medium tracking-[-0.42px] text-white">{title}</p>
      <p className="text-sm leading-[20px] tracking-[-0.36px] text-[#b8b8b8]">{description}</p>
    </div>
  );
}

function FeatureGrid({ items }: { items: readonly { title: string; description: string }[] }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      {items.map((item) => (
        <FeatureCard key={item.title} title={item.title} description={item.description} />
      ))}
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <section className="py-8">
      <div className="flex flex-col gap-3">
        <h2 className="text-title font-medium leading-[26px] tracking-[-0.66px] text-white">{title}</h2>
        {description ? (
          <p className="text-base leading-[24px] tracking-[-0.42px] text-[#b8b8b8]">{description}</p>
        ) : null}
      </div>
      {children ? <div className="mt-5">{children}</div> : null}
    </section>
  );
}

function Paragraphs({ lines, leading = "leading-[24px]" }: { lines: string[]; leading?: string }) {
  return (
    <div className="flex flex-col gap-3">
      {lines.map((line) => (
        <p key={line} className={`text-base ${leading} tracking-[-0.48px] text-[#b8b8b8]`}>
          {line}
        </p>
      ))}
    </div>
  );
}

export function Introduction({
  onBrowseLibrary,
}: {
  /** When provided, "Browse Library" becomes a button firing this instead of linking. */
  onBrowseLibrary?: () => void;
} = {}) {
  const showcase = introShowcaseEntries();

  return (
    <div className="font-[family-name:var(--font-roboto-mono)] min-h-[calc(100vh-12px)] bg-[#111] px-6 pb-12 pt-[70px] shadow-[0px_4px_10px_rgba(0,0,0,0.04)] sm:px-10 lg:px-[200px]">
      <div className="mx-auto w-full max-w-[1042px]">
        <header className="pb-8">
          <h1 className="text-display font-medium leading-10 tracking-[-0.96px] text-white">
            Introduction
          </h1>
          <div className="mt-3 flex flex-col gap-3">
            <p className="text-base leading-[24px] tracking-[-0.48px] text-[#b8b8b8]">
              Compify UI is a collection of production-ready components, interactions, and UI
              patterns built for both React and Framer. Copy components directly into your codebase
              or duplicate them inside Framer and customize them to fit your project.
            </p>
            <p className="text-base leading-[24px] tracking-[-0.48px] text-[#b8b8b8]">
              Built for designers, developers, and teams who care about great user experiences.
            </p>
            <p className="text-base leading-[24px] tracking-[-0.48px] text-[#b8b8b8]">
              This is more than a component library. It&apos;s a platform for discovering, copying,
              and shipping high-quality UI faster.
            </p>
          </div>
        </header>

        <Divider />

        <Section title="Why Compify UI?">
          <Paragraphs
            lines={[
              "Building polished interfaces takes time. Every interaction, animation, and micro-detail requires design, development, testing, and refinement.",
              "Most libraries focus on basic building blocks. Compify UI focuses on the experiences users actually notice.",
              "From animated buttons and navigation patterns to complex interactions and complete UI sections, every component is designed to help you create products that feel modern and engaging.",
            ]}
          />
        </Section>

        <Divider />

        <Section
          title="Cross-Platform Components"
          description="Every component is available across multiple workflows."
        >
          <FeatureGrid items={CROSS_PLATFORM} />
        </Section>

        <Divider />

        <section className="flex flex-col items-center gap-5 py-8">
          <IntroShowcase entries={showcase} />
          {onBrowseLibrary ? (
            <button
              type="button"
              onClick={onBrowseLibrary}
              className="bg-white px-3 py-1.5 text-lg tracking-[-0.54px] text-black transition hover:bg-white/90"
            >
              Browse Library
            </button>
          ) : (
            <Link
              href="/"
              className="bg-white px-3 py-1.5 text-lg tracking-[-0.54px] text-black transition hover:bg-white/90"
            >
              Browse Library
            </Link>
          )}
        </section>

        <Divider />

        <Section title="Designed for Speed">
          <Paragraphs
            lines={[
              "Whether you're building a startup, client project, SaaS product, or marketing site, Compify UI helps you move from idea to implementation faster.",
              "Browse components. Copy what you need. Customize it. Ship it.",
            ]}
          />
        </Section>

        <Divider />

        <Section title="Built for Modern Teams">
          <Paragraphs
            lines={[
              "Compify UI bridges the gap between design and development by providing components that work across tools and workflows.",
              "The result is a faster process, better consistency, and less time spent recreating the same UI patterns.",
              "Create better experiences. Ship faster.",
            ]}
          />
        </Section>

        <Divider />

        <Section
          title="Open & Customizable"
          description="Compify UI gives you full control over every component."
        >
          <FeatureGrid items={OPEN_CUSTOMIZABLE} />
        </Section>
      </div>
    </div>
  );
}
