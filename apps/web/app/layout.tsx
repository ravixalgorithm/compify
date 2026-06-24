import { Suspense } from "react";
import type { Metadata } from "next";
import { Roboto_Mono, Space_Mono } from "next/font/google";
import { CATEGORIES } from "@compify/shared";
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

  const categories = CATEGORIES.map((c) => ({
    id: c.id,
    label: c.label,
    count: registry.filter((e) => e.category === c.id).length,
  })).filter((c) => c.count > 0);

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
