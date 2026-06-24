import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

/**
 * Returns the signed-in user iff they are an admin (app_metadata.is_admin or
 * role === "admin"), else null. Same gate as apps/web/app/admin/layout.tsx.
 * app_metadata is backend-only, so users cannot grant themselves access.
 */
export async function getAdminUser(): Promise<User | null> {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const meta = (user.app_metadata ?? {}) as { is_admin?: boolean; role?: string };
  const isAdmin = meta.is_admin === true || meta.role === "admin";
  return isAdmin ? user : null;
}
