import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

/**
 * Backend-enforced admin gate for everything under /admin. Only users flagged
 * as admin in Supabase (app_metadata.is_admin or role === "admin") may enter;
 * everyone else is redirected home. app_metadata is server-only, so users can't
 * grant themselves access.
 */
export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const meta = user?.app_metadata ?? {};
  const isAdmin = Boolean(meta.is_admin === true || meta.role === "admin");
  if (!isAdmin) redirect("/");

  return children;
}
