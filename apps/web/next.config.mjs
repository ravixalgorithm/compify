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
    // The admin publish route resolves the repo via process.cwd(), which makes
    // Next trace the entire build dir into its serverless function and blow past
    // Vercel's 250 MB limit. None of these are needed at runtime.
    outputFileTracingExcludes: {
      "*": ["**/.next/cache/**"],
      "/api/admin/publish": [
        "**/.next/cache/**",
        "**/.next/static/**",
        "**/.next/trace",
        "**/public/**",
      ],
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
