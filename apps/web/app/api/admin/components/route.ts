import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import type { ComponentCategory } from "@compify/shared/types";
import { getAdminUser } from "@/lib/server/require-admin";
import { createAdminClient } from "@/utils/supabase/admin";
import { compileComponent } from "@/lib/server/compile-component";
import { introspectControls } from "@/lib/server/introspect-controls";
import { deriveComponentRow } from "@/lib/server/component-row";
import { uploadToR2, r2Configured, r2KeyFromUrl, deleteFromR2 } from "@/lib/server/r2";
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

// Gallery / variant thumbnail media — image or video.
const MEDIA_TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["video/mp4", "mp4"],
  ["video/webm", "webm"],
  ["video/quicktime", "mov"],
]);

// Comma- OR newline-separated (tags, related slugs).
function parseStringList(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// One entry per LINE only — commas are kept as content (key features and
// description paragraphs can read "Light, dark, and system themes").
function parseLines(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
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

    // 1b. Introspect the compiled module for its real, fully-typed control
    //     schema (every ControlType, resolved defaults). Falls back to the regex
    //     source parser inside deriveComponentRow if this returns null.
    const introspectedSchema = await introspectControls(compiled.code);

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

    // 3b. Optional gallery / variant thumbnail media (image or video) — stored on
    //     Cloudflare R2 (S3-compatible). Each uses a stable per-surface key so
    //     re-uploads overwrite; a per-save token cache-busts the public URL.
    const mediaToken = Date.now().toString(36);
    async function uploadMedia(
      field: "galleryMedia" | "variantMedia",
    ): Promise<{ url?: string; cleared?: boolean; error?: string }> {
      if (form.get(`${field}Clear`) === "true") return { cleared: true };
      const file = form.get(field);
      if (!(file instanceof File) || file.size === 0) return {};
      const ext = MEDIA_TYPES.get(file.type);
      if (!ext) return { error: "Thumbnail media must be an image (PNG/JPEG/WebP/GIF) or video (MP4/WebM/MOV)." };
      if (!r2Configured()) {
        return { error: "Media storage (Cloudflare R2) is not configured on the server." };
      }
      const key = `components/${slug}-${field === "galleryMedia" ? "gallery" : "variant"}.${ext}`;
      try {
        const url = await uploadToR2(key, new Uint8Array(await file.arrayBuffer()), file.type);
        return { url: `${url}?v=${mediaToken}` };
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Media upload to R2 failed." };
      }
    }

    const galleryMedia = await uploadMedia("galleryMedia");
    const variantMedia = await uploadMedia("variantMedia");
    for (const m of [galleryMedia, variantMedia]) {
      if (m.error) return NextResponse.json({ error: m.error, stage: "upload" }, { status: 400 });
    }

    // 4. Derive metadata from source + form, then upsert the row.
    const row = deriveComponentRow({
      slug,
      source,
      displayName: String(form.get("displayName") ?? "").trim(),
      category: (String(form.get("category") ?? "cards") as ComponentCategory),
      description: String(form.get("description") ?? "").trim(),
      descriptionParagraphs: parseLines(String(form.get("descriptionParagraphs") ?? "")),
      keyFeatures: parseLines(String(form.get("keyFeatures") ?? "")),
      tags: parseStringList(String(form.get("tags") ?? "")),
      related: parseStringList(String(form.get("related") ?? "")),
      previewAccent: String(form.get("previewAccent") ?? "#7C3AED"),
      featured: form.get("featured") === "true",
      framerModuleUrl: String(form.get("framerModuleUrl") ?? "").trim() || undefined,
      usage: String(form.get("usage") ?? "").trim() || undefined,
    }, { tweakSchema: introspectedSchema });

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
    if (galleryMedia.url) payload.gallery_media_url = galleryMedia.url;
    else if (galleryMedia.cleared) payload.gallery_media_url = null;
    if (variantMedia.url) payload.variant_media_url = variantMedia.url;
    else if (variantMedia.cleared) payload.variant_media_url = null;
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

  // Grab the R2 media URLs before the row is gone so we can clean them up.
  const { data: existing } = await db
    .from("components")
    .select("gallery_media_url, variant_media_url")
    .eq("slug", slug)
    .maybeSingle();

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

  // Remove gallery/variant media from R2 (keys derived from the stored URLs).
  for (const url of [existing?.gallery_media_url, existing?.variant_media_url]) {
    const key = r2KeyFromUrl(url);
    if (key) await deleteFromR2(key);
  }

  revalidateTag(COMPONENTS_TAG);

  return NextResponse.json({ ok: true, slug });
}
