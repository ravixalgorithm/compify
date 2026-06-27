import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getAdminUser } from "@/lib/server/require-admin";
import { createAdminClient } from "@/utils/supabase/admin";
import { COMPONENTS_TAG } from "@/lib/db-components";

export const runtime = "nodejs";

/**
 * Toggle a component's admin-curated `featured` flag. Admin-only. Writes use the
 * service-role client (the components table has no public write path via RLS).
 */
export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { slug?: string; featured?: boolean };
  const slug = String(body.slug ?? "").trim();
  if (!slug) {
    return NextResponse.json({ error: "Missing slug." }, { status: 400 });
  }
  const featured = Boolean(body.featured);

  try {
    const db = createAdminClient();
    const { error } = await db.from("components").update({ featured }).eq("slug", slug);

    if (error) {
      console.error("[featured] update failed:", error);
      return NextResponse.json({ error: `Update failed: ${error.message}` }, { status: 500 });
    }

    revalidateTag(COMPONENTS_TAG);
    return NextResponse.json({ ok: true, slug, featured });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[featured] unhandled error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
