import { McpDocs } from "@/components/McpDocs";
import { FramerDocs } from "@/components/FramerDocs";
import { CodeDocs } from "@/components/CodeDocs";
import { IntegrationTabs } from "@/components/IntegrationTabs";
import { parseIntegrationTab } from "@/lib/integration-tabs";

export const metadata = {
  title: "Integrations · Compify UI",
  description:
    "Use Compify UI components your way — connect the MCP server, copy onto the Framer canvas, or copy the raw component code.",
};

export default function IntegrationsPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const initialTab = parseIntegrationTab(searchParams.tab);
  return (
    <main className="min-w-0 flex-1 p-1.5">
      <IntegrationTabs
        initialTab={initialTab}
        mcp={<McpDocs />}
        framer={<FramerDocs />}
        code={<CodeDocs />}
      />
    </main>
  );
}
