import { McpDocs } from "@/components/McpDocs";

export const metadata = {
  title: "MCP · Compify UI",
  description:
    "Connect the Compify UI MCP server to Claude Code, Codex, or Cursor. Tools, workflows, and setup.",
};

export default function ConnectPage() {
  return (
    <main className="min-w-0 flex-1 p-1.5">
      <div className="min-h-[calc(100vh-12px)] bg-bg p-6 sm:p-10">
        <McpDocs />
      </div>
    </main>
  );
}
