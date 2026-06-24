import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import type { ComponentCategory } from "@compify/shared/types";
import { getAdminUser } from "@/lib/server/require-admin";
import { createAdminClient } from "@/utils/supabase/admin";
import { compileComponent } from "@/lib/server/compile-component";
import { deriveComponentRow } from "@/lib/server/component-row";
import { COMPONENTS_TAG } from "@/lib/db-components";

// esbuild needs the Node runtime (native binary), not the Edge runtime.
export const runtime = "nodejs";

const MODULES_BUCKET = "component-modules";
const THUMBS_BUCKET = "component-thumbnails";

const THUMB_TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
]);

function parseStringList(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Create or update a component. Admin-only. Compiles the source to a runtime
 * ESM module, uploads it (+ optional thumbnail) to Storage, and upserts the
 * components row. Writes use the service-role client (RLS has no public write).
 */
export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const slug = String(form.get("slug") ?? "").trim();
    const source = String(form.get("source") ?? "");

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return NextResponse.json(
        { error: "Slug must be kebab-case (lowercase letters, numbers, hyphens)." },
        { status: 400 },
      );
    }
    if (!source.trim()) {
      return NextResponse.json({ error: "Component source is required." }, { status: 400 });
    }

    // 1. Compile first — never persist a component that doesn't build. The
    //    esbuild error is surfaced verbatim so the admin can fix the source.
    const compiled = await compileComponent({ source, slug });
    if (!compiled.ok) {
      return NextResponse.json({ error: compiled.error, stage: "compile" }, { status: 400 });
    }

    const db = createAdminClient();

    // 2. Upload the module under a content-hashed, immutable path.
    const modulePath = `${slug}/${compiled.hash}.mjs`;
    const modUpload = await db.storage
      .from(MODULES_BUCKET)
      .upload(modulePath, compiled.code, { contentType: "application/javascript", upsert: true });
    if (modUpload.error) {
      return NextResponse.json(
        { error: `Module upload failed: ${modUpload.error.message}`, stage: "upload" },
        { status: 500 },
      );
    }
    const compiledModuleUrl = db.storage.from(MODULES_BUCKET).getPublicUrl(modulePath).data.publicUrl;

    // 3. Optional thumbnail.
    let thumbnailUrl: string | undefined;
    const thumbEntry = form.get("thumbnail");
    if (thumbEntry instanceof File && thumbEntry.size > 0) {
      const ext = THUMB_TYPES.get(thumbEntry.type);
      if (!ext) {
        return NextResponse.json({ error: "Thumbnail must be PNG, JPEG, or WebP." }, { status: 400 });
      }
      const bytes = Buffer.from(await thumbEntry.arrayBuffer());
      const thumbPath = `${slug}.${ext}`;
      const thumbUpload = await db.storage
        .from(THUMBS_BUCKET)
        .upload(thumbPath, bytes, { contentType: thumbEntry.type, upsert: true });
      if (thumbUpload.error) {
        return NextResponse.json(
          { error: `Thumbnail upload failed: ${thumbUpload.error.message}`, stage: "upload" },
          { status: 500 },
        );
      }
      thumbnailUrl = db.storage.from(THUMBS_BUCKET).getPublicUrl(thumbPath).data.publicUrl;
    }

    // 4. Derive metadata from source + form, then upsert the row.
    const row = deriveComponentRow({
      slug,
      source,
      displayName: String(form.get("displayName") ?? "").trim(),
      category: (String(form.get("category") ?? "cards") as ComponentCategory),
      description: String(form.get("description") ?? "").trim(),
      descriptionParagraphs: parseStringList(String(form.get("descriptionParagraphs") ?? "")),
      keyFeatures: parseStringList(String(form.get("keyFeatures") ?? "")),
      tags: parseStringList(String(form.get("tags") ?? "")),
      related: parseStringList(String(form.get("related") ?? "")),
      previewAccent: String(form.get("previewAccent") ?? "#7C3AED"),
      premium: form.get("premium") === "true",
      framerModuleUrl: String(form.get("framerModuleUrl") ?? "").trim() || undefined,
      usage: String(form.get("usage") ?? "").trim() || undefined,
    });

    const publish = String(form.get("status") ?? "published") !== "draft";
    const previewLayoutRaw = String(form.get("previewLayout") ?? "").trim();

    const payload: Record<string, unknown> = {
      ...row,
      compiled_module_url: compiledModuleUrl,
      compiled_module_hash: compiled.hash,
      compile_status: "ready",
      compile_error: null,
      status: publish ? "published" : "draft",
      published_at: publish ? new Date().toISOString() : null,
      created_by: admin.id,
    };
    if (thumbnailUrl) payload.thumbnail_url = thumbnailUrl;
    if (previewLayoutRaw) {
      try {
        payload.preview_layout = JSON.parse(previewLayoutRaw);
      } catch {
        return NextResponse.json({ error: "previewLayout must be valid JSON." }, { status: 400 });
      }
    }

    const { data, error } = await db
      .from("components")
      .upsert(payload, { onConflict: "slug" })
      .select("id, slug, status, compiled_module_url, thumbnail_url")
      .single();

    if (error) {
      return NextResponse.json({ error: `Save failed: ${error.message}`, stage: "db" }, { status: 500 });
    }

    // ISR: make the new/updated component appear on the live site immediately.
    revalidateTag(COMPONENTS_TAG);

    return NextResponse.json({ ok: true, component: data, warnings: compiled.warnings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Publish failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Delete a component (row + its Storage objects). Admin-only. */
export async function DELETE(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  const slug = new URL(request.url).searchParams.get("slug")?.trim();
  if (!slug) {
    return NextResponse.json({ error: "Missing ?slug." }, { status: 400 });
  }

  const db = createAdminClient();

  const { error } = await db.from("components").delete().eq("slug", slug);
  if (error) {
    return NextResponse.json({ error: `Delete failed: ${error.message}` }, { status: 500 });
  }

  // Best-effort Storage cleanup — a failure here doesn't fail the delete.
  const mods = await db.storage.from(MODULES_BUCKET).list(slug);
  if (mods.data?.length) {
    await db.storage.from(MODULES_BUCKET).remove(mods.data.map((f) => `${slug}/${f.name}`));
  }
  await db.storage.from(THUMBS_BUCKET).remove([`${slug}.png`, `${slug}.jpg`, `${slug}.webp`]);

  revalidateTag(COMPONENTS_TAG);

  return NextResponse.json({ ok: true, slug });
}
