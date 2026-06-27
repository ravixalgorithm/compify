import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Compile the workspace source packages directly.
  transpilePackages: ["@compify/library", "@compify/shared"],
  // Include library sources for server-side readSource() on Vercel.
  experimental: {
    // Client router cache: keep a visited dynamic route's RSC payload around so
    // navigating back to it (e.g. component detail → home gallery) is served from
    // cache — instant, no server round-trip / skeleton — instead of refetching
    // the live DB on every return. The gallery tolerates up to this much
    // staleness on back-nav; detail-page view counts refresh client-side anyway.
    staleTimes: {
      dynamic: 60,
      static: 300,
    },
    // esbuild has a native binary + dynamic requires; let Next require it at
    // runtime instead of bundling it into the serverless function (fixes the
    // admin compile routes in dev and on Vercel).
    serverComponentsExternalPackages: ["esbuild"],
    outputFileTracingIncludes: {
      "/components/[name]": [
        "../../packages/library/src/components/**/*",
        "../../registry.json",
      ],
      "/admin/(panel)/components/[slug]": [
        "../../packages/library/src/components/**/*",
        "../../registry.json",
      ],
    },
    outputFileTracingExcludes: {
      "*": ["**/.next/cache/**"],
    },
  },
  webpack: (config) => {
    // Resolve the bare `framer` import (used by every library component) to
    // our no-op shim so the exact same source renders outside Framer.
    config.resolve.alias = {
      ...config.resolve.alias,
      framer: resolve(__dirname, "../../packages/library/src/framer-shim.ts"),
    };
    return config;
  },
};

export default nextConfig;
