import { notFound } from "next/navigation";

// /spike is the Spike 1 runtime-loader harness — a development-only proof, not a
// user-facing page. Keep it reachable locally for debugging but hide it from
// production builds (NODE_ENV is inlined at build time, so prod statically 404s).
export default function SpikeLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return <>{children}</>;
}
