import { redirect } from "next/navigation";

// The standalone Framer page was merged into the tabbed /integrations page.
// Kept as a redirect so old links and bookmarks land on the Framer tab.
export default function FramerRedirectPage() {
  redirect("/integrations?tab=framer");
}
