import { Suspense } from "react";
import type { Metadata } from "next";
import { Roboto_Mono, Space_Mono } from "next/font/google";
import { CATEGORIES, categoryLabel } from "@compify/shared";
import { listDbComponents } from "@/lib/db-components";
import { AppFrame } from "@/components/AppFrame";
import { RuntimeGlobals } from "@/components/RuntimeGlobals";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-roboto-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-space-mono",
  display: "swap",
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Compify UI — Framer-safe components, delivered",
  description:
    "A component marketplace and MCP delivery layer for Framer builders and React developers. Browse, tweak, and copy production-ready custom code components.",
  metadataBase: new URL("https://compify.ui"),
  openGraph: {
    title: "Compify UI",
    description: "Framer-safe components, delivered to your canvas or your editor.",
    type: "website",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const registry = (await listDbComponents()).map((c) => c.entry);

  // Build the library list from the categories actually present — built-in
  // categories first (curated order), then any custom (admin-created) ones
  // alphabetically — so custom categories show up as gallery filters too.
  const counts = new Map<string, number>();
  for (const e of registry) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
  const knownIds = CATEGORIES.map((c) => c.id);
  const customIds = [...counts.keys()]
    .filter((id) => !knownIds.includes(id))
    .sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b)));
  const categories = [...knownIds, ...customIds]
    .filter((id) => (counts.get(id) ?? 0) > 0)
    .map((id) => ({ id, label: categoryLabel(id), count: counts.get(id) ?? 0 }));

  const components = registry.map((e) => ({
    name: e.name,
    displayName: e.displayName,
  }));

  return (
    <html lang="en" className={`${robotoMono.variable} ${spaceMono.variable}`}>
      <body>
        <RuntimeGlobals />
        <Suspense fallback={<div className="min-h-screen bg-bg" />}>
          <AppFrame
            categories={categories}
            components={components}
            registry={registry}
          >
            {children}
          </AppFrame>
        </Suspense>
        <Toaster />
      </body>
    </html>
  );
}
