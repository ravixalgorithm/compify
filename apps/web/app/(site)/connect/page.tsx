import { redirect } from "next/navigation";

// The standalone MCP page was merged into the tabbed /integrations page.
// Kept as a redirect so old links and bookmarks land on the MCP tab.
export default function ConnectRedirectPage() {
  redirect("/integrations?tab=mcp");
}
