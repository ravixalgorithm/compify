import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getAdminUser } from "@/lib/server/require-admin";
import { createAdminClient } from "@/utils/supabase/admin";
import { COMPONENTS_TAG } from "@/lib/db-components";

export const runtime = "nodejs";

/**
 * Move a component to the top of its home grid column. Admin-only. Pins it to
 * the given column and sets its sort_position just below that column's current
 * lowest (most-negative wins), so the most-recently-pinned sorts first within
 * the column. Writes use the service-role client.
 */
export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { slug?: string; column?: number };
  const slug = String(body.slug ?? "").trim();
  const column = Number(body.column);
  if (!slug) {
    return NextResponse.json({ error: "Missing slug." }, { status: 400 });
  }
  if (!Number.isInteger(column) || column < 0) {
    return NextResponse.json({ error: "Invalid column." }, { status: 400 });
  }

  try {
    const db = createAdminClient();

    // Lowest position across ALL pinned components; the clicked component goes
    // above all of them so it becomes the first card in the grid.
    const { data: top, error: readError } = await db
      .from("components")
      .select("sort_position")
      .not("sort_position", "is", null)
      .order("sort_position", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (readError) {
      console.error("[position] read failed:", readError);
      return NextResponse.json({ error: `Read failed: ${readError.message}` }, { status: 500 });
    }

    const nextPos = (top?.sort_position ?? 0) - 1;

    // grid_column is kept non-null so the pin stays "active"; the gallery now
    // always renders pinned cards at the start (first column), so its value
    // doesn't affect placement.
    const { error } = await db
      .from("components")
      .update({ grid_column: column, sort_position: nextPos })
      .eq("slug", slug);

    if (error) {
      console.error("[position] update failed:", error);
      return NextResponse.json({ error: `Update failed: ${error.message}` }, { status: 500 });
    }

    revalidateTag(COMPONENTS_TAG);
    return NextResponse.json({ ok: true, slug, column, position: nextPos });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[position] unhandled error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
