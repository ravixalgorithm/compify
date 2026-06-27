import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getAdminUser } from "@/lib/server/require-admin";
import { createAdminClient } from "@/utils/supabase/admin";
import { COMPONENTS_TAG } from "@/lib/db-components";

export const runtime = "nodejs";

/**
 * Move a component to the top of the Featured view. Admin-only. Sets its
 * `featured_position` just below the current lowest (most-negative wins), so the
 * most-recently-moved sorts first. Independent of the home-grid pins. Writes use
 * the service-role client.
 */
export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { slug?: string };
  const slug = String(body.slug ?? "").trim();
  if (!slug) {
    return NextResponse.json({ error: "Missing slug." }, { status: 400 });
  }

  try {
    const db = createAdminClient();

    // Lowest featured_position among featured components; the clicked one goes
    // above all of them so it becomes the first card in the Featured view.
    const { data: top, error: readError } = await db
      .from("components")
      .select("featured_position")
      .eq("featured", true)
      .not("featured_position", "is", null)
      .order("featured_position", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (readError) {
      console.error("[featured-position] read failed:", readError);
      return NextResponse.json({ error: `Read failed: ${readError.message}` }, { status: 500 });
    }

    const nextPos = (top?.featured_position ?? 0) - 1;

    // Keep `featured` true so a reorder can't accidentally un-feature the card.
    const { error } = await db
      .from("components")
      .update({ featured: true, featured_position: nextPos })
      .eq("slug", slug);

    if (error) {
      console.error("[featured-position] update failed:", error);
      return NextResponse.json({ error: `Update failed: ${error.message}` }, { status: 500 });
    }

    revalidateTag(COMPONENTS_TAG);
    return NextResponse.json({ ok: true, slug, position: nextPos });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[featured-position] unhandled error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
