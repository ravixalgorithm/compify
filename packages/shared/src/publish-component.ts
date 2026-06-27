import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ComponentCategory } from "./types";
import {
  getRepoRoot,
  syncRegistry,
  type ComponentMeta,
  type SyncRegistryResult,
} from "./sync-registry";

const COMPONENTS_DIR = "packages/library/src/components";
const THUMBNAILS_DIR = "apps/web/public/thumbnails";

const SLUG_RE = /^[a-z][a-z0-9-]*$/;

export interface PublishComponentInput {
  slug: string;
  source: string;
  meta: ComponentMeta;
  thumbnail?: {
    data: Buffer;
    ext: "png" | "jpg" | "jpeg" | "webp";
  };
}

export interface PublishComponentResult {
  slug: string;
  componentPath: string;
  metaPath: string;
  thumbnailPath?: string;
  pageUrl: string;
  sync: SyncRegistryResult;
}

export function validateSlug(slug: string): string | null {
  if (!slug) return "Slug is required.";
  if (!SLUG_RE.test(slug)) {
    return "Slug must be lowercase letters, numbers, and hyphens (start with a letter).";
  }
  return null;
}

export function validateSource(source: string): string | null {
  if (!source.trim()) return "Component source is required.";
  if (!/export\s+default\s+function/.test(source) && !/export\s+default\s+/.test(source)) {
    return "Component must use a default export.";
  }
  if (!/addPropertyControls\s*\(/.test(source)) {
    return "Component must include addPropertyControls for marketplace controls.";
  }
  return null;
}

function writeMetaFile(root: string, slug: string, meta: ComponentMeta): string {
  const metaPath = join(root, COMPONENTS_DIR, `${slug}.meta.json`);
  writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`, "utf8");
  return metaPath;
}

function writeSourceFile(root: string, slug: string, source: string): string {
  const componentPath = join(root, COMPONENTS_DIR, `${slug}.tsx`);
  writeFileSync(componentPath, source.endsWith("\n") ? source : `${source}\n`, "utf8");
  return componentPath;
}

function writeThumbnailFile(
  root: string,
  slug: string,
  thumbnail: PublishComponentInput["thumbnail"],
): { path: string; publicPath: string } | undefined {
  if (!thumbnail) return undefined;

  const ext = thumbnail.ext === "jpeg" ? "jpg" : thumbnail.ext;
  const dir = join(root, THUMBNAILS_DIR);
  mkdirSync(dir, { recursive: true });

  const filename = `${slug}.${ext}`;
  const path = join(dir, filename);
  writeFileSync(path, thumbnail.data);

  return { path, publicPath: `/thumbnails/${filename}` };
}

/** Writes component files, optional thumbnail, meta sidecar, then syncs registry + index. */
export function publishComponent(input: PublishComponentInput): PublishComponentResult {
  const slugError = validateSlug(input.slug);
  if (slugError) throw new Error(slugError);

  const sourceError = validateSource(input.source);
  if (sourceError) throw new Error(sourceError);

  const root = getRepoRoot();
  const componentPath = writeSourceFile(root, input.slug, input.source);

  const thumb = writeThumbnailFile(root, input.slug, input.thumbnail);
  const meta: ComponentMeta = {
    ...input.meta,
    thumbnail: thumb?.publicPath ?? input.meta.thumbnail ?? `/thumbnails/${input.slug}.png`,
  };

  const metaPath = writeMetaFile(root, input.slug, meta);
  const sync = syncRegistry({ write: true });

  return {
    slug: input.slug,
    componentPath,
    metaPath,
    thumbnailPath: thumb?.path,
    pageUrl: `/components/${input.slug}`,
    sync,
  };
}

export function metaFromForm(fields: {
  displayName: string;
  category: ComponentCategory;
  description: string;
  tags: string[];
  previewAccent: string;
  usage?: string;
  related?: string[];
  keyFeatures?: string[];
  descriptionParagraphs?: string[];
  thumbnail?: string;
  framerModuleUrl?: string;
}): ComponentMeta {
  return {
    displayName: fields.displayName,
    category: fields.category,
    description: fields.description,
    tags: fields.tags,
    previewAccent: fields.previewAccent,
    usage: fields.usage,
    related: fields.related,
    keyFeatures: fields.keyFeatures,
    descriptionParagraphs: fields.descriptionParagraphs,
    thumbnail: fields.thumbnail,
    framerModuleUrl: fields.framerModuleUrl?.trim() || undefined,
    variants: ["framer"],
  };
}
