import { StreamableHTTPTransport } from "@hono/mcp";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { authRequired, extractApiKey, verifyApiKey } from "./auth.js";
import { listComponents } from "./registry-source.js";
import { createCompifyServer } from "./server.js";

/** Shared Hono app — used by local Node server and Vercel serverless. */
export function createApp() {
  const app = new Hono<{ Variables: { userId: string } }>();
  app.use("*", cors());

  app.get("/", async (c) => {
    let componentCount = 0;
    try {
      componentCount = (await listComponents()).length;
    } catch {
      /* DB unavailable — still serve metadata */
    }
    return c.json({
      name: "compify-ui-mcp",
      version: "1.0.0",
      description:
        "Compify UI MCP server — stack-aware delivery of Framer-safe components.",
      endpoint: "/mcp",
      tools: ["list_components", "get_component"],
      components: componentCount,
      authRequired: authRequired(),
      connect: {
        claudeCode:
          'claude mcp add compify-ui --transport http --url <this-server>/mcp --header "Authorization: Bearer <your-key>"',
        codex:
          "export COMPIFY_UI_API_KEY=<your-key> && codex mcp add compify-ui --url <this-server>/mcp --bearer-token-env-var COMPIFY_UI_API_KEY",
        cursor: {
          mcpServers: {
            "compify-ui": {
              url: "<this-server>/mcp",
              headers: { Authorization: "Bearer <your-key>" },
            },
          },
        },
      },
    });
  });

  app.get("/health", (c) => c.json({ ok: true }));

  app.use("/mcp", async (c, next) => {
    if (!authRequired()) return next();

    const key = extractApiKey(c);
    if (!key) {
      return c.json(
        {
          error:
            "Missing API key. Pass it as 'Authorization: Bearer <key>'. Create one at Compify UI → Profile → API Keys.",
        },
        401,
      );
    }

    const result = await verifyApiKey(key);
    if (result.ok === false) {
      return c.json({ error: result.reason }, 401);
    }

    c.set("userId", result.userId);
    return next();
  });

  app.all("/mcp", async (c) => {
    const server = createCompifyServer();
    const transport = new StreamableHTTPTransport();
    await server.connect(transport);
    const res = await transport.handleRequest(c);
    return res ?? c.body(null, 204);
  });

  return app;
}
