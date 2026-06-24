import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getComponent, listComponents } from "./registry-source.js";
import { transformComponent } from "./transform.js";
import { incrementCopy } from "./stats.js";

const stackEnum = z.enum(["framer", "react", "nextjs", "vite"]);
const stylingEnum = z.enum(["css", "tailwind", "cssmodules"]);

function text(t: string) {
  return { content: [{ type: "text" as const, text: t }] };
}

/**
 * Builds a fully-configured Compify UI MCP server with the two delivery
 * tools. A fresh instance is created per HTTP request (stateless transport).
 */
export function createCompifyServer(): McpServer {
  const server = new McpServer({
    name: "compify-ui",
    version: "1.0.0",
  });

  server.registerTool(
    "list_components",
    {
      title: "List components",
      description:
        "Returns the Compify UI component index from the registry. Use this to discover available components or find the right one for a request. Optionally filter by category (hero, navbar, pricing, cards, forms, animation, data).",
      inputSchema: { category: z.string().optional() },
    },
    async ({ category }) => {
      const all = await listComponents();
      const filtered = category ? all.filter((c) => c.category === category) : all;
      const index = filtered.map((c) => ({
        name: c.name,
        displayName: c.displayName,
        category: c.category,
        description: c.description,
        tags: c.tags,
        variants: c.variants,
        dependencies: c.dependencies,
        premium: c.premium,
      }));
      return text(JSON.stringify({ count: index.length, components: index }, null, 2));
    }
  );

  server.registerTool(
    "get_component",
    {
      title: "Get component",
      description:
        "Returns the source code for a Compify UI component, adapted to the caller's stack. Pass `stack`, `styling`, and `typescript` so the right variant is served (Framer source as-authored, or plain React / Next.js with Framer bindings removed). Pass `tweaks` (a map of prop -> value) to document the exact configuration from the website tweak panel.",
      inputSchema: {
        name: z.string(),
        stack: stackEnum.optional(),
        styling: stylingEnum.optional(),
        typescript: z.boolean().optional(),
        tweaks: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
      },
    },
    async ({ name, stack, styling, typescript, tweaks }) => {
      const found = await getComponent(name);
      if (!found) {
        const names = (await listComponents()).map((c) => c.name).join(", ");
        return text(`No component named "${name}". Available: ${names}`);
      }
      const { entry, source } = found;
      void incrementCopy(entry.name); // count MCP deliveries toward "used by"
      const code = transformComponent(source, { stack, styling, typescript, tweaks });
      const meta = {
        name: entry.name,
        displayName: entry.displayName,
        stack: stack ?? "framer",
        dependencies: entry.dependencies,
        installHint:
          entry.dependencies.length > 0
            ? `npm install ${entry.dependencies.join(" ")}`
            : "No extra dependencies.",
      };
      return text(
        `${JSON.stringify(meta, null, 2)}\n\n\`\`\`tsx\n${code}\`\`\``
      );
    }
  );

  return server;
}
