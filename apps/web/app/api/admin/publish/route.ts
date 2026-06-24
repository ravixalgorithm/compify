import { NextResponse } from "next/server";
import type { ComponentCategory } from "@compify/shared/types";
import { metaFromForm, publishComponent } from "@compify/shared/server";
import { isAdminEnabled, isRequestAuthenticated } from "@/lib/admin-auth";

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

export async function POST(request: Request) {
  if (!isAdminEnabled()) {
    return NextResponse.json(
      {
        error:
          "Admin publish is disabled. Set COMPIFY_ADMIN_TOKEN in apps/web/.env.local and restart the dev server.",
      },
      { status: 503 },
    );
  }

  if (!isRequestAuthenticated(request)) {
    return NextResponse.json({ error: "Please sign in to the admin panel." }, { status: 401 });
  }

  try {
    const form = await request.formData();

    const slug = String(form.get("slug") ?? "").trim();
    const source = String(form.get("source") ?? "");
    const displayName = String(form.get("displayName") ?? "").trim();
    const category = String(form.get("category") ?? "cards") as ComponentCategory;
    const description = String(form.get("description") ?? "").trim();
    const previewAccent = String(form.get("previewAccent") ?? "#7C3AED");
    const usage = String(form.get("usage") ?? "").trim() || undefined;
    const premium = form.get("premium") === "true";
    const tags = parseStringList(String(form.get("tags") ?? ""));
    const related = parseStringList(String(form.get("related") ?? ""));
    const keyFeatures = parseStringList(String(form.get("keyFeatures") ?? ""));
    const descriptionParagraphs = parseStringList(String(form.get("descriptionParagraphs") ?? ""));
    const framerModuleUrl = String(form.get("framerModuleUrl") ?? "").trim() || undefined;

    const thumbEntry = form.get("thumbnail");
    let thumbnail: { data: Buffer; ext: "png" | "jpg" | "jpeg" | "webp" } | undefined;

    if (thumbEntry instanceof File && thumbEntry.size > 0) {
      const ext = THUMB_TYPES.get(thumbEntry.type);
      if (!ext) {
        return NextResponse.json(
          { error: "Thumbnail must be PNG, JPEG, or WebP." },
          { status: 400 },
        );
      }
      const bytes = Buffer.from(await thumbEntry.arrayBuffer());
      thumbnail = { data: bytes, ext: ext as "png" | "jpg" | "jpeg" | "webp" };
    }

    const meta = metaFromForm({
      displayName: displayName || slug,
      category,
      description,
      tags,
      previewAccent,
      usage,
      premium,
      related,
      keyFeatures,
      descriptionParagraphs,
      framerModuleUrl,
    });

    const result = publishComponent({
      slug,
      source,
      meta,
      thumbnail,
    });

    return NextResponse.json({
      ok: true,
      slug: result.slug,
      pageUrl: result.pageUrl,
      componentPath: result.componentPath,
      metaPath: result.metaPath,
      thumbnailPath: result.thumbnailPath,
      sync: {
        created: result.sync.created,
        updated: result.sync.updated,
        warnings: result.sync.warnings,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Publish failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
