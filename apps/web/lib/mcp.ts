/** Default hosted MCP endpoint (production). */
export const MCP_URL_PROD = "https://compify-mcp.vercel.app/mcp";

/** Local MCP endpoint when running `pnpm dev:mcp`. */
export const MCP_URL_LOCAL = "http://localhost:8787/mcp";

export type McpHost = "prod" | "local";

export function mcpUrl(host: McpHost = "prod"): string {
  if (host === "local") return MCP_URL_LOCAL;
  return process.env.NEXT_PUBLIC_MCP_URL ?? MCP_URL_PROD;
}
