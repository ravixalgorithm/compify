"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  categoryLabel,
  tweakableSchema,
  type RegistryEntry,
  type TweakState,
} from "@compify/shared";
import { TweakPanel } from "@/components/TweakPanel";
import { PreviewFrame } from "@/components/PreviewFrame";
import { GradientSupportProbe } from "@/components/GradientSupportProbe";
import { useLiveControls } from "@/lib/runtime-module";
import { collectFontFamilies, ensureFontLoaded } from "@/lib/fonts";
import { resolvePreviewLayout } from "@/lib/preview";
import { isVideoUrl } from "@/components/MediaThumb";
import type { CategoryOption } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { parsePropertyControls } from "@/lib/parsePropertyControls";
import {
  slugify,
  tweakDefaults,
  type EditorDraft,
} from "@/lib/generateRegistryOutput";

type Tab = "details" | "preview";

function draftFromEntry(entry: RegistryEntry, source: string): EditorDraft {
  return {
    templateSlug: entry.name,
    name: entry.name,
    displayName: entry.displayName,
    category: entry.category,
    description: entry.description,
    descriptionParagraphs: (entry.descriptionParagraphs ?? []).join("\n"),
    keyFeatures: (entry.keyFeatures ?? []).join("\n"),
    tags: entry.tags.join(", "),
    related: (entry.related ?? []).join(", "),
    previewAccent: entry.previewAccent,
    premium: entry.premium,
    source,
    tweakSchema: entry.tweakSchema.map((c) => ({ ...c })),
    usage: entry.usage,
    framerModuleUrl: entry.framerModuleUrl ?? "",
    previewLayout: previewLayoutJson(entry),
    galleryMedia: entry.galleryMedia,
    variantMedia: entry.variantMedia,
  };
}

/**
 * Rebuild the stored preview_layout JSON ({ mode?, gallery?, detail?, variant? })
 * from an entry so the admin's saved per-surface presets (fit/align/height/…)
 * load back into the form instead of resetting to defaults on edit.
 */
function previewLayoutJson(entry: RegistryEntry): string | undefined {
  const layout: Record<string, unknown> = {};
  if (entry.previewLayout) layout.mode = entry.previewLayout;
  for (const surface of ["gallery", "detail", "variant"] as const) {
    const s = entry.previewSurfaces?.[surface];
    if (!s) continue;
    const cleaned: Record<string, unknown> = {};
    if (s.fit && s.fit !== "auto") cleaned.fit = s.fit;
    if (typeof s.minHeight === "number") cleaned.minHeight = s.minHeight;
    if (typeof s.maxWidth === "number") cleaned.maxWidth = s.maxWidth;
    if (typeof s.padding === "number") cleaned.padding = s.padding;
    if (s.align) cleaned.align = s.align;
    if (typeof s.scale === "number" && s.scale !== 1) cleaned.scale = s.scale;
    if (Object.keys(cleaned).length) layout[surface] = cleaned;
  }
  return Object.keys(layout).length ? JSON.stringify(layout) : undefined;
}

function emptyDraft(): EditorDraft {
  return {
    templateSlug: "",
    name: "",
    displayName: "",
    category: "cards",
    description: "",
    descriptionParagraphs: "",
    keyFeatures: "",
    tags: "",
    related: "",
    previewAccent: "#7C3AED",
    premium: false,
    source: "",
    tweakSchema: [],
    usage: "",
    framerModuleUrl: "",
  };
}

const inputClass =
  "w-full border border-field bg-field px-3 py-2.5 text-[14px] text-white outline-none placeholder:text-muted-foreground focus:border-muted-foreground";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="flex flex-col gap-0.5">
        <span className="text-[12px] font-medium uppercase tracking-[-0.24px] text-white">{label}</span>
        {hint ? <span className="text-[12px] leading-snug text-muted-foreground">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

/** Grouped section card for the form — a titled panel on the dark page. */
function FormCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5 border border-stroke bg-surface p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-[13px] font-medium tracking-[-0.2px] text-white">{title}</h2>
        {description ? (
          <p className="text-[12px] leading-snug text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

type SurfaceLayoutValue = {
  fit?: string;
  minHeight?: number;
  maxWidth?: number;
  padding?: number;
  align?: string;
  scale?: number;
};

const numCtrlClass =
  "w-[68px] border border-field bg-field px-2 py-1 text-[12px] text-white outline-none focus:border-muted-foreground";

function num(v: string): number | undefined {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
}

/** Per-surface framing controls: fit, height, padding, alignment. */
function SurfaceControls({
  layout,
  onChange,
  measuredHeight,
}: {
  layout?: SurfaceLayoutValue;
  onChange: (patch: SurfaceLayoutValue) => void;
  /** Actual rendered height of the frame, shown when no explicit override. */
  measuredHeight?: number;
}) {
  const l = layout ?? {};
  // DB components default to fill (cover); toggling off explicitly centers so the
  // Size/Height controls take effect.
  const cover = (l.fit ?? "fill") === "fill";
  const heightValue =
    l.minHeight ?? (measuredHeight != null ? Math.round(measuredHeight) : "");
  const padding = l.padding ?? 0;
  const sizePct = Math.round((l.scale ?? 1) * 100);
  return (
    <div className="flex flex-col gap-3 border border-stroke bg-surface px-4 py-3 text-[12px]">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {/* Cover: stretch the component to the full preview width; height follows
            its aspect ratio. Off = centered at natural size. */}
        <label className="flex items-center gap-2 text-muted">
          <button
            type="button"
            role="switch"
            aria-checked={cover}
            onClick={() => onChange({ fit: cover ? "center" : "fill" })}
            className={cn(
              "relative h-[18px] w-[32px] shrink-0 rounded-full transition-colors",
              cover ? "bg-white" : "bg-field",
            )}
          >
            <span
              className={cn(
                "absolute top-[2px] size-[14px] rounded-full transition-[left]",
                cover ? "left-[16px] bg-black" : "left-[2px] bg-muted",
              )}
            />
          </button>
          <span className={cn(cover && "text-white")}>Cover</span>
        </label>

        <label className="flex items-center gap-2 text-muted">
          Height
          <input
            type="number"
            className={numCtrlClass}
            placeholder="auto"
            value={heightValue}
            onChange={(e) => onChange({ minHeight: num(e.target.value) })}
          />
          {l.minHeight != null ? (
            <button
              type="button"
              onClick={() => onChange({ minHeight: undefined })}
              className="text-muted-foreground transition hover:text-white"
            >
              auto
            </button>
          ) : null}
        </label>
      </div>

      <label className="flex items-center gap-3 text-muted">
        <span className="w-[52px] shrink-0">Size</span>
        <input
          type="range"
          min={25}
          max={250}
          step={5}
          value={sizePct}
          onChange={(e) => {
            const pct = Number(e.target.value);
            onChange({ scale: pct === 100 ? undefined : pct / 100 });
          }}
          className="h-[4px] flex-1 cursor-pointer accent-white"
        />
        <span className="w-[40px] shrink-0 text-right tabular-nums text-white">{sizePct}%</span>
      </label>

      <label className="flex items-center gap-3 text-muted">
        <span className="w-[52px] shrink-0">Padding</span>
        <input
          type="range"
          min={0}
          max={120}
          step={2}
          value={padding}
          onChange={(e) => onChange({ padding: Number(e.target.value) })}
          className="h-[4px] flex-1 cursor-pointer accent-white"
        />
        <span className="w-[40px] shrink-0 text-right tabular-nums text-white">{padding}px</span>
      </label>
    </div>
  );
}

/** Thumbnail media upload (image or video) — fills the fixed surface width and
 *  shows the media at its natural aspect ratio, matching the live card/tile. */
function MediaUploadField({
  label,
  hint,
  src,
  isVideo,
  onFile,
  onClear,
}: {
  label: string;
  hint: string;
  src: string | null;
  isVideo: boolean;
  onFile: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-2">
      <span className="flex flex-col gap-0.5">
        <span className="text-[12px] font-medium uppercase tracking-[-0.24px] text-white">{label}</span>
        <span className="text-[12px] leading-snug text-muted-foreground">{hint}</span>
      </span>

      {src ? (
        <div className="relative w-full overflow-hidden border border-stroke bg-black">
          {isVideo ? (
            <video src={src} className="block h-auto w-full" muted loop autoPlay playsInline />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="block h-auto w-full" />
          )}
          <div className="absolute right-2 top-2 flex gap-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="bg-bg/85 px-2 py-1 text-[12px] text-white backdrop-blur transition hover:bg-bg"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={onClear}
              className="bg-bg/85 px-2 py-1 text-[12px] text-red-400 backdrop-blur transition hover:bg-bg hover:text-red-300"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 border border-dashed border-panel-line bg-field/30 px-4 py-8 text-center text-muted transition hover:border-stroke-hover hover:text-white"
        >
          <Upload size={18} />
          <span className="text-[13px]">Upload image or video</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function UploadZone({
  label,
  hint,
  accept,
  fileName,
  onFile,
  icon,
}: {
  label: string;
  hint: string;
  accept: string;
  fileName?: string | null;
  onFile: (file: File) => void;
  icon: React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="border border-dashed border-panel-line bg-field/30 p-6 text-center">
      <div className="mx-auto mb-3 flex size-10 items-center justify-center bg-elevated text-muted">
        {icon}
      </div>
      <p className="text-[14px] text-white">{label}</p>
      <p className="mt-1 text-[12px] text-muted">{hint}</p>
      {fileName ? (
        <p className="mt-3 flex items-center justify-center gap-1 text-[12px] text-green-400">
          <Check size={14} />
          {fileName}
        </p>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-4 border border-stroke bg-elevated px-4 py-2 text-[13px] text-white transition hover:bg-bg"
      >
        Choose file
      </button>
    </div>
  );
}

function FilesSidebar({
  componentFileName,
  controlCount,
  onComponentFile,
}: {
  componentFileName: string | null;
  controlCount: number;
  onComponentFile: (file: File) => void;
}) {
  return (
    <aside className="sticky top-6 w-[320px] shrink-0 space-y-4 border border-stroke bg-surface p-4">
      <p className="text-[12px] uppercase tracking-[-0.24px] text-muted">Upload files</p>

      <UploadZone
        label="Component file"
        hint="Upload the .tsx file from Framer or your library."
        accept=".tsx,.ts,text/plain"
        fileName={componentFileName}
        onFile={onComponentFile}
        icon={<Upload size={18} />}
      />

      {controlCount ? (
        <p className="text-[13px] text-green-400">
          <Check size={14} className="mr-1 inline" />
          {controlCount} controls detected from the component file.
        </p>
      ) : (
        <p className="text-[13px] text-amber-400">
          Upload a component file to detect controls automatically.
        </p>
      )}
    </aside>
  );
}

export function ComponentForm({
  mode,
  initialEntry,
  initialSource,
  categoryOptions = [],
}: {
  mode: "create" | "edit";
  initialEntry?: RegistryEntry;
  initialSource?: string;
  /** Built-in + existing custom categories, suggested in the category field. */
  categoryOptions?: CategoryOption[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("details");
  const [draft, setDraft] = useState<EditorDraft>(() =>
    initialEntry && initialSource
      ? draftFromEntry(initialEntry, initialSource)
      : emptyDraft(),
  );
  const [previewState, setPreviewState] = useState<TweakState>({});
  const [componentFileName, setComponentFileName] = useState<string | null>(
    initialEntry ? `${initialEntry.name}.tsx` : null,
  );
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Live preview of the uploaded source, compiled on demand to a blob module.
  const [previewModuleUrl, setPreviewModuleUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [compilingPreview, setCompilingPreview] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Categories created in this session (added to the dropdown immediately; they
  // persist for future once a component using them is saved).
  const [extraCategories, setExtraCategories] = useState<CategoryOption[]>([]);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  // Gallery / variant thumbnail media: a freshly chosen file (preview via object
  // URL) or, in edit mode, the existing uploaded URL on the draft. A cleared
  // flag removes the existing one on save.
  const [galleryMediaFile, setGalleryMediaFile] = useState<File | null>(null);
  const [variantMediaFile, setVariantMediaFile] = useState<File | null>(null);
  const [galleryMediaCleared, setGalleryMediaCleared] = useState(false);
  const [variantMediaCleared, setVariantMediaCleared] = useState(false);
  // Actual rendered height of the detail preview stage, shown in the Height
  // control so the admin sees the real number instead of "auto".
  const [detailPreviewHeight, setDetailPreviewHeight] = useState<number | null>(null);
  const previewMeasureRef = useRef<HTMLDivElement>(null);

  const galleryFileUrl = useMemo(
    () => (galleryMediaFile ? URL.createObjectURL(galleryMediaFile) : null),
    [galleryMediaFile],
  );
  const variantFileUrl = useMemo(
    () => (variantMediaFile ? URL.createObjectURL(variantMediaFile) : null),
    [variantMediaFile],
  );
  useEffect(
    () => () => {
      if (galleryFileUrl) URL.revokeObjectURL(galleryFileUrl);
    },
    [galleryFileUrl],
  );
  useEffect(
    () => () => {
      if (variantFileUrl) URL.revokeObjectURL(variantFileUrl);
    },
    [variantFileUrl],
  );

  // Measure the live detail preview height so the Height control can show the
  // real number. Re-attaches when the compiled preview (re)mounts.
  useEffect(() => {
    const el = previewMeasureRef.current;
    if (!el) return;
    const measure = () => setDetailPreviewHeight(el.getBoundingClientRect().height);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [previewModuleUrl, tab, previewState]);

  const galleryMediaSrc = galleryFileUrl ?? (galleryMediaCleared ? null : draft.galleryMedia ?? null);
  const variantMediaSrc = variantFileUrl ?? (variantMediaCleared ? null : draft.variantMedia ?? null);
  const galleryIsVideo = galleryMediaFile
    ? galleryMediaFile.type.startsWith("video/")
    : galleryMediaSrc
      ? isVideoUrl(galleryMediaSrc)
      : false;
  const variantIsVideo = variantMediaFile
    ? variantMediaFile.type.startsWith("video/")
    : variantMediaSrc
      ? isVideoUrl(variantMediaSrc)
      : false;

  // Dropdown options: built-in + existing custom + session-created, plus the
  // current draft category (so editing a one-off category still shows it).
  const categorySelectOptions = useMemo(() => {
    const map = new Map<string, CategoryOption>();
    for (const c of categoryOptions) map.set(c.id, c);
    for (const c of extraCategories) if (!map.has(c.id)) map.set(c.id, c);
    if (draft.category && !map.has(draft.category)) {
      map.set(draft.category, { id: draft.category, label: categoryLabel(draft.category) });
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [categoryOptions, extraCategories, draft.category]);

  function addCategory() {
    const id = slugify(newCategory);
    if (!id) return;
    setExtraCategories((prev) =>
      prev.some((c) => c.id === id) ? prev : [...prev, { id, label: categoryLabel(id) }],
    );
    updateDraft({ category: id });
    setNewCategory("");
    setCreatingCategory(false);
  }

  // The schema introspected from the compiled preview module is the real,
  // fully-typed control set (every ControlType, resolved defaults) — same as the
  // live site. Fall back to the regex-parsed draft schema until it loads.
  const liveSchema = useLiveControls(previewModuleUrl ?? undefined);
  const activeSchema = liveSchema ?? draft.tweakSchema;

  const defaults = useMemo(() => tweakDefaults(activeSchema), [activeSchema]);
  const previewSlug = mode === "edit" ? draft.name : draft.name || draft.templateSlug;
  const tweakableControls = useMemo(
    () => tweakableSchema(activeSchema),
    [activeSchema],
  );
  const canPreview = Boolean(draft.source.trim());

  // Probe which color props render a gradient, so the picker hides the Gradient
  // tab where it wouldn't take effect (see GradientSupportProbe). Re-probes when
  // the compiled module or the set of color controls changes.
  const colorKeys = useMemo(
    () => tweakableControls.filter((c) => c.type === "color").map((c) => c.key),
    [tweakableControls],
  );
  const colorKeySig = colorKeys.join(",");
  const [gradientKeys, setGradientKeys] = useState<Set<string> | null>(null);
  useEffect(() => {
    setGradientKeys(null);
  }, [previewModuleUrl, colorKeySig]);

  // Per-surface preview framing, parsed from the draft's previewLayout JSON.
  const previewLayoutObj = useMemo<Record<string, any>>(() => {
    if (!draft.previewLayout) return {};
    try {
      return JSON.parse(draft.previewLayout) ?? {};
    } catch {
      return {};
    }
  }, [draft.previewLayout]);

  // Only the detail surface is previewed now; the gallery card and variant tile
  // use uploaded thumbnail/video instead, so they no longer need a live preview.
  const previewSurfaces = useMemo<RegistryEntry["previewSurfaces"]>(() => {
    const v = previewLayoutObj.detail;
    if (v && typeof v === "object") {
      return {
        detail: {
          fit: v.fit ?? "auto",
          minHeight: v.minHeight,
          padding: v.padding,
          scale: v.scale,
        },
      };
    }
    return undefined;
  }, [previewLayoutObj]);

  function setSurfaceLayout(
    surface: "gallery" | "detail" | "variant",
    patch: Record<string, unknown>,
  ) {
    const next = { ...previewLayoutObj };
    const cur = { ...(next[surface] ?? {}) };
    for (const [k, v] of Object.entries(patch)) {
      // Treat empty / auto / NaN as "unset" so the override stays minimal.
      if (v === undefined || v === "" || v === "auto" || (typeof v === "number" && Number.isNaN(v))) {
        delete cur[k];
      } else {
        cur[k] = v;
      }
    }
    if (Object.keys(cur).length) next[surface] = cur;
    else delete next[surface];
    updateDraft({ previewLayout: Object.keys(next).length ? JSON.stringify(next) : undefined });
  }

  // Keep existing edits when the schema changes (e.g. the live introspected one
  // arrives after compile); seed new controls with their default, drop removed.
  useEffect(() => {
    setPreviewState((prev) => {
      const next: TweakState = {};
      for (const control of activeSchema) {
        next[control.key] =
          control.key in prev ? prev[control.key] : control.default;
      }
      return next;
    });
  }, [activeSchema]);

  // Preload active font families so the preview renders in them even when the
  // relevant control is in a collapsed panel section.
  useEffect(() => {
    for (const family of collectFontFamilies(activeSchema, previewState)) {
      ensureFontLoaded(family);
    }
  }, [activeSchema, previewState]);

  function updateDraft(patch: Partial<EditorDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  // Compile the current draft source on the server and load it as a blob module
  // so the preview reflects the uploaded component before it is published.
  async function buildPreview() {
    if (!draft.source.trim()) return;
    setCompilingPreview(true);
    setPreviewError(null);
    try {
      const res = await fetch("/api/admin/compile-preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source: draft.source, slug: previewSlug || "preview" }),
      });
      const data = (await res.json()) as { ok?: boolean; code?: string; error?: string };
      if (!res.ok || !data.ok || !data.code) {
        setPreviewError(data.error ?? "Could not compile the component for preview.");
        return;
      }
      const url = URL.createObjectURL(new Blob([data.code], { type: "text/javascript" }));
      setPreviewModuleUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return url;
      });
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : "Could not compile the component.");
    } finally {
      setCompilingPreview(false);
    }
  }

  // Rebuild the preview whenever the admin opens the preview tab or changes the
  // uploaded source.
  useEffect(() => {
    if (tab === "preview" && draft.source.trim()) void buildPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, draft.source]);

  // Revoke the blob URL on unmount.
  useEffect(() => {
    return () => {
      if (previewModuleUrl?.startsWith("blob:")) URL.revokeObjectURL(previewModuleUrl);
    };
  }, [previewModuleUrl]);

  async function handleDelete() {
    if (mode !== "edit") return;
    setConfirmDelete(false);
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/components?slug=${encodeURIComponent(draft.name)}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not delete.");
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete.");
      setDeleting(false);
    }
  }

  async function handleComponentFile(file: File) {
    const text = await file.text();
    const slug = slugify(file.name.replace(/\.tsx?$/i, ""));
    const parsed = parsePropertyControls(text);
    setComponentFileName(file.name);
    setDraft((prev) => ({
      ...prev,
      name: mode === "create" ? slug : prev.name,
      displayName: prev.displayName || slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      source: text,
      tweakSchema: parsed.length ? parsed : prev.tweakSchema,
      templateSlug: mode === "create" ? slug : prev.templateSlug,
    }));
  }

  async function handlePublish() {
    setPublishing(true);
    setError(null);

    try {
      if (!draft.name.trim()) throw new Error("Component ID is required.");
      if (!draft.displayName.trim()) throw new Error("Display name is required.");
      if (!draft.source.trim()) throw new Error("Upload a component file first.");
      // The server introspects the compiled module for the real schema (every
      // ControlType), so only require the source to declare controls here —
      // don't gate on what the quick regex parse happened to recognise.
      if (!/addPropertyControls\s*\(/.test(draft.source)) {
        throw new Error("No controls found in the file. Make sure it includes Framer property controls.");
      }

      const form = new FormData();
      form.append("slug", draft.name);
      form.append("source", draft.source);
      form.append("displayName", draft.displayName);
      // Normalise the category to a slug so a typed label ("My Widgets") becomes
      // a clean id ("my-widgets"); known categories pass through unchanged.
      form.append("category", slugify(draft.category) || "cards");
      form.append("description", draft.description);
      form.append("descriptionParagraphs", draft.descriptionParagraphs);
      form.append("keyFeatures", draft.keyFeatures);
      form.append("tags", draft.tags);
      form.append("related", draft.related);
      form.append("previewAccent", draft.previewAccent);
      form.append("usage", draft.usage);
      form.append("premium", String(draft.premium));
      form.append("framerModuleUrl", draft.framerModuleUrl ?? "");

      if (draft.previewLayout) form.append("previewLayout", draft.previewLayout);

      // Gallery / variant thumbnail media: send new files, or a clear flag when
      // an existing one was removed.
      if (galleryMediaFile) form.append("galleryMedia", galleryMediaFile);
      else if (galleryMediaCleared) form.append("galleryMediaClear", "true");
      if (variantMediaFile) form.append("variantMedia", variantMediaFile);
      else if (variantMediaCleared) form.append("variantMediaClear", "true");

      const res = await fetch("/api/admin/components", { method: "POST", body: form });
      const data = (await res.json()) as { error?: string; stage?: string; component?: { slug: string } };

      if (!res.ok) {
        throw new Error(
          data.stage === "compile"
            ? `Component failed to compile:\n${data.error}`
            : (data.error ?? "Could not publish."),
        );
      }

      router.push(`/components/${draft.name}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish.");
    } finally {
      setPublishing(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "details", label: "Details" },
    { id: "preview", label: "Preview & publish" },
  ];

  const filesSidebar = (
    <FilesSidebar
      componentFileName={componentFileName}
      controlCount={tweakableControls.length}
      onComponentFile={handleComponentFile}
    />
  );

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted">
            {mode === "create" ? "New component" : "Edit component"}
          </p>
          <h1 className="mt-1 text-2xl font-medium tracking-tight text-white">
            {mode === "create" ? "Add to marketplace" : draft.displayName}
          </h1>
        </div>
        {mode === "edit" ? (
          <Link
            href={`/components/${draft.name}`}
            className="text-[13px] text-muted transition hover:text-white"
          >
            View live page →
          </Link>
        ) : null}
      </div>

      <div className="flex gap-1 border-b border-stroke">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "-mb-px border-b-2 px-4 py-3 text-[13px] font-medium transition",
              tab === t.id
                ? "border-white text-white"
                : "border-transparent text-muted hover:text-white",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "details" ? (
        <div className="flex items-start gap-6">
          <div className="flex min-w-0 max-w-2xl flex-1 flex-col gap-5">
            <FormCard
              title="Basics"
              description="How the component is identified across the marketplace."
            >
              <Field label="Display name" hint="Shown on the marketplace card and detail page.">
                <input
                  className={inputClass}
                  value={draft.displayName}
                  onChange={(e) => updateDraft({ displayName: e.target.value })}
                  placeholder="Contact Form"
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Component ID"
                  hint={mode === "edit" ? "Locked after publishing." : "Used in the page URL."}
                >
                  <input
                    className={cn(inputClass, mode === "edit" && "opacity-60")}
                    value={draft.name}
                    disabled={mode === "edit"}
                    onChange={(e) => updateDraft({ name: slugify(e.target.value) })}
                    placeholder="contact-form"
                  />
                </Field>

                <Field label="Category">
                  <select
                    className={inputClass}
                    value={draft.category}
                    onChange={(e) =>
                      updateDraft({ category: e.target.value as EditorDraft["category"] })
                    }
                  >
                    {categorySelectOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>

                  {creatingCategory ? (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        autoFocus
                        className={inputClass}
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addCategory();
                          } else if (e.key === "Escape") {
                            setCreatingCategory(false);
                            setNewCategory("");
                          }
                        }}
                        placeholder="New category name"
                      />
                      <button
                        type="button"
                        onClick={addCategory}
                        disabled={!slugify(newCategory)}
                        className="flex h-[42px] shrink-0 items-center justify-center bg-white px-3 text-black transition hover:bg-white/90 disabled:opacity-40"
                        aria-label="Add category"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCreatingCategory(false);
                          setNewCategory("");
                        }}
                        aria-label="Cancel"
                        className="flex h-[42px] shrink-0 items-center justify-center border border-stroke px-3 text-muted transition hover:text-white"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCreatingCategory(true)}
                      className="mt-2 flex w-fit items-center gap-1 text-[12px] text-muted transition hover:text-white"
                    >
                      <Plus size={13} /> New category
                    </button>
                  )}
                </Field>
              </div>

              <Field label="Short description" hint="One-line summary for the gallery card.">
                <textarea
                  className={cn(inputClass, "min-h-[80px] resize-y")}
                  value={draft.description}
                  onChange={(e) => updateDraft({ description: e.target.value })}
                />
              </Field>
            </FormCard>

            <FormCard
              title="Listing content"
              description="Tags and highlights shown on the component page."
            >
              <Field label="Tags" hint="Comma-separated, e.g. form, dark, framer-motion">
                <input
                  className={inputClass}
                  value={draft.tags}
                  onChange={(e) => updateDraft({ tags: e.target.value })}
                />
              </Field>

              <Field label="Key features" hint="One per line — shown on the component page.">
                <textarea
                  className={cn(inputClass, "min-h-[100px] resize-y")}
                  value={draft.keyFeatures}
                  onChange={(e) => updateDraft({ keyFeatures: e.target.value })}
                  placeholder={"Animated success state\nLight and dark themes\nFramer-safe"}
                />
              </Field>
            </FormCard>

            <FormCard
              title="Thumbnails"
              description="Image or video shown on the gallery card and variant tile, instead of the live preview. Each fills the surface width; height follows the media's aspect ratio."
            >
              <MediaUploadField
                label="Main page (gallery card)"
                hint="Shown on the home grid."
                src={galleryMediaSrc}
                isVideo={galleryIsVideo}
                onFile={(f) => {
                  setGalleryMediaFile(f);
                  setGalleryMediaCleared(false);
                }}
                onClear={() => {
                  setGalleryMediaFile(null);
                  setGalleryMediaCleared(true);
                }}
              />
              <MediaUploadField
                label="Variant tab (sidebar tile)"
                hint="Shown in the component's variant grid."
                src={variantMediaSrc}
                isVideo={variantIsVideo}
                onFile={(f) => {
                  setVariantMediaFile(f);
                  setVariantMediaCleared(false);
                }}
                onClear={() => {
                  setVariantMediaFile(null);
                  setVariantMediaCleared(true);
                }}
              />
            </FormCard>

            <FormCard title="Distribution">
              <Field
                label="Framer module URL"
                hint="After hosting on Framer, paste the framer.com/m/… link for Copy Framer URL."
              >
                <input
                  className={inputClass}
                  value={draft.framerModuleUrl}
                  onChange={(e) => updateDraft({ framerModuleUrl: e.target.value })}
                  placeholder="https://framer.com/m/pricing-three-tier-abc12"
                />
              </Field>

              <button
                type="button"
                onClick={() => updateDraft({ premium: !draft.premium })}
                className="flex items-center justify-between gap-3 border border-stroke bg-bg px-4 py-3 text-left transition hover:border-stroke-hover"
              >
                <span className="flex flex-col gap-0.5">
                  <span className="text-[14px] text-white">Featured / premium</span>
                  <span className="text-[12px] text-muted-foreground">
                    Highlight this component in the featured sort.
                  </span>
                </span>
                <span
                  className={cn(
                    "flex size-[20px] shrink-0 items-center justify-center border transition",
                    draft.premium
                      ? "border-white bg-white text-black"
                      : "border-stroke text-transparent",
                  )}
                >
                  <Check size={14} />
                </span>
              </button>
            </FormCard>

            <button
              type="button"
              onClick={() => setTab("preview")}
              className="ui-press flex h-11 w-fit items-center bg-white px-6 text-[14px] font-medium text-black transition hover:bg-white/90"
            >
              Continue to preview
            </button>
          </div>
          {filesSidebar}
        </div>
      ) : null}

      {tab === "preview" ? (
        <div className="space-y-6">
          {/* Mirrors the live detail layout (ComponentWorkspace): the preview
              stage fills the column at the same width the component has on the
              real site, with the tweak panel as the side rail. Only the detail
              surface is previewed — gallery card and variant tile use uploaded
              thumbnail/video. */}
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start 3xl:mx-auto 3xl:max-w-[1560px]">
            <div className="min-w-0 flex-1">
              {!canPreview ? (
                <div className="flex min-h-[480px] items-center justify-center border border-stroke bg-bg text-[14px] text-muted">
                  Upload a component file to see the live preview.
                </div>
              ) : previewError ? (
                <div className="flex min-h-[480px] items-center justify-center border border-stroke bg-bg p-6 text-center font-mono text-[12px] leading-relaxed text-red-400">
                  {previewError}
                </div>
              ) : !previewModuleUrl ? (
                <div className="flex min-h-[480px] items-center justify-center gap-2 border border-stroke bg-bg text-[14px] text-muted">
                  <Loader2 size={16} className="animate-spin" /> Compiling preview…
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-muted">
                      Detail preview · live width
                    </p>
                  </div>
                  <div ref={previewMeasureRef}>
                    <PreviewFrame
                      name={previewSlug}
                      state={previewState}
                      previewAccent={draft.previewAccent}
                      moduleUrl={previewModuleUrl}
                      surfaceLayout={previewSurfaces?.detail}
                      previewLayout={resolvePreviewLayout({
                        name: previewSlug,
                        category: draft.category,
                        previewLayout: initialEntry?.previewLayout,
                      })}
                    />
                  </div>
                  {/* Preview editing options sit below the stage (room to grow). */}
                  <SurfaceControls
                    layout={previewLayoutObj.detail}
                    onChange={(p) => setSurfaceLayout("detail", p)}
                    measuredHeight={detailPreviewHeight ?? undefined}
                  />
                </div>
              )}
            </div>
            {tweakableControls.length ? (
              <aside className="h-[70vh] w-full shrink-0 overflow-hidden xl:sticky xl:top-8 xl:h-[calc(100vh-120px)] xl:w-[325px] 3xl:w-[500px]">
                {gradientKeys === null && previewModuleUrl && colorKeys.length > 0 ? (
                  <GradientSupportProbe
                    name={previewSlug}
                    moduleUrl={previewModuleUrl}
                    defaults={defaults}
                    colorKeys={colorKeys}
                    onResult={setGradientKeys}
                  />
                ) : null}
                <TweakPanel
                  schema={tweakableControls}
                  state={previewState}
                  onChange={(key, value) =>
                    setPreviewState((s) => ({ ...s, [key]: value }))
                  }
                  onReset={() => setPreviewState(defaults)}
                  gradientKeys={gradientKeys}
                />
              </aside>
            ) : null}
          </div>

          <div className="flex max-w-2xl flex-col gap-3 border border-stroke bg-surface p-6">
            <h2 className="text-[16px] text-white">Ready to publish?</h2>
            <p className="text-[13px] leading-relaxed text-muted">
              This updates the marketplace immediately — gallery listing, detail page, controls,
              documentation, and copy button.
            </p>
            {error ? <p className="text-[13px] text-red-400">{error}</p> : null}
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing}
              className="flex h-11 items-center justify-center gap-2 bg-white text-[14px] font-medium text-black transition hover:bg-white/90 disabled:opacity-40"
            >
              {publishing ? <Loader2 size={16} className="animate-spin" /> : null}
              {publishing
                ? "Publishing…"
                : mode === "create"
                  ? "Publish to marketplace"
                  : "Save changes"}
            </button>

            {mode === "edit" ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={deleting || publishing}
                className="flex h-10 items-center justify-center gap-2 border border-red-500/40 text-[13px] text-red-400 transition hover:bg-red-500/10 disabled:opacity-40"
              >
                {deleting ? <Loader2 size={15} className="animate-spin" /> : null}
                {deleting ? "Deleting…" : "Delete component"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(false)}
        onConfirm={() => void handleDelete()}
        destructive
        icon={<Trash2 size={20} />}
        title="Delete component?"
        description={
          <>
            <span className="text-white">{draft.displayName}</span> will be removed from the
            marketplace. This cannot be undone.
          </>
        }
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        loading={deleting}
      />
    </div>
  );
}
