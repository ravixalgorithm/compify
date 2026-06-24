import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { createApp } from "./hono-app.js";
import { authRequired } from "./auth.js";

// Load packages/mcp-server/.env (if present) before reading any config.
try {
  const envPath = resolve(dirname(fileURLToPath(import.meta.url)), "..", ".env");
  process.loadEnvFile?.(envPath);
} catch {
  /* no .env file — rely on the process environment */
}

const app = createApp();
const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  // eslint-disable-next-line no-console
  console.log(`Compify UI MCP server listening on http://localhost:${info.port}`);
  console.log(`  • MCP endpoint:  http://localhost:${info.port}/mcp`);
  console.log(`  • API key auth:  ${authRequired() ? "required" : "open (dev)"}`);
});
