// Shared (non-client) helpers for the Integrations page tabs, so the server
// page can call parseIntegrationTab while the client tab bar imports the type.

export type IntegrationTab = "mcp" | "framer" | "code";

export function parseIntegrationTab(value: string | undefined): IntegrationTab {
  return value === "framer" || value === "code" ? value : "mcp";
}
