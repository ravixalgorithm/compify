"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ImageIcon, Loader2, Upload } from "lucide-react";
import {
  CATEGORIES,
  tweakableSchema,
  type RegistryEntry,
  type TweakState,
} from "@compify/shared";
import { TweakPanel } from "@/components/TweakPanel";
import { PreviewFrame } from "@/components/PreviewFrame";
import { resolvePreviewLayout } from "@/lib/preview";
import { cn } from "@/lib/cn";
import { parsePropertyControls } from "@/lib/parsePropertyControls";
import { componentThumbnail } from "@/lib/thumbnails";
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
  };
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
  "w-full border border-stroke bg-black px-3 py-2.5 text-[14px] text-white outline-none placeholder:text-muted-foreground focus:border-stroke-hover";

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
      <span className="text-[12px] uppercase tracking-[-0.24px] text-muted">{label}</span>
      {hint ? <span className="text-[12px] leading-snug text-muted-foreground">{hint}</span> : null}
      {children}
    </label>
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
    <div className="border border-dashed border-stroke bg-black/40 p-6 text-center">
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
  thumbnailFile,
  thumbnailPreview,
  controlCount,
  onComponentFile,
  onThumbnailFile,
}: {
  componentFileName: string | null;
  thumbnailFile: File | null;
  thumbnailPreview: string | null;
  controlCount: number;
  onComponentFile: (file: File) => void;
  onThumbnailFile: (file: File) => void;
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

      <UploadZone
        label="Gallery thumbnail"
        hint="PNG, JPEG, or WebP for the browse page."
        accept="image/png,image/jpeg,image/webp"
        fileName={thumbnailFile?.name ?? (thumbnailPreview ? "Current thumbnail" : null)}
        onFile={onThumbnailFile}
        icon={<ImageIcon size={18} />}
      />

      {thumbnailPreview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailPreview}
          alt="Thumbnail preview"
          className="h-36 w-full border border-stroke object-cover"
        />
      ) : null}

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
}: {
  mode: "create" | "edit";
  initialEntry?: RegistryEntry;
  initialSource?: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("details");
  const [draft, setDraft] = useState<EditorDraft>(() =>
    initialEntry && initialSource
      ? draftFromEntry(initialEntry, initialSource)
      : emptyDraft(),
  );
  const [previewState, setPreviewState] = useState<TweakState>({});
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(
    initialEntry ? componentThumbnail(initialEntry) : null,
  );
  const [componentFileName, setComponentFileName] = useState<string | null>(
    initialEntry ? `${initialEntry.name}.tsx` : null,
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaults = useMemo(() => tweakDefaults(draft.tweakSchema), [draft.tweakSchema]);
  const previewSlug = mode === "edit" ? draft.name : draft.name || draft.templateSlug;
  const tweakableControls = useMemo(
    () => tweakableSchema(draft.tweakSchema),
    [draft.tweakSchema],
  );
  const canPreview = Boolean(previewSlug && draft.tweakSchema.length);

  useEffect(() => {
    setPreviewState(defaults);
  }, [defaults]);

  useEffect(() => {
    return () => {
      if (thumbnailPreview?.startsWith("blob:")) URL.revokeObjectURL(thumbnailPreview);
    };
  }, [thumbnailPreview]);

  function updateDraft(patch: Partial<EditorDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
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

  function handleThumbnailFile(file: File) {
    if (thumbnailPreview?.startsWith("blob:")) URL.revokeObjectURL(thumbnailPreview);
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  }

  async function handlePublish() {
    setPublishing(true);
    setError(null);

    try {
      if (!draft.name.trim()) throw new Error("Component ID is required.");
      if (!draft.displayName.trim()) throw new Error("Display name is required.");
      if (!draft.source.trim()) throw new Error("Upload a component file first.");
      if (!draft.tweakSchema.length) {
        throw new Error("No controls found in the file. Make sure it includes Framer property controls.");
      }

      const form = new FormData();
      form.append("slug", draft.name);
      form.append("source", draft.source);
      form.append("displayName", draft.displayName);
      form.append("category", draft.category);
      form.append("description", draft.description);
      form.append("descriptionParagraphs", draft.descriptionParagraphs);
      form.append("keyFeatures", draft.keyFeatures);
      form.append("tags", draft.tags);
      form.append("related", draft.related);
      form.append("previewAccent", draft.previewAccent);
      form.append("usage", draft.usage);
      form.append("premium", String(draft.premium));
      form.append("framerModuleUrl", draft.framerModuleUrl ?? "");
      if (thumbnailFile) form.append("thumbnail", thumbnailFile);

      const res = await fetch("/api/admin/publish", { method: "POST", body: form });
      const data = (await res.json()) as { error?: string; pageUrl?: string };

      if (!res.ok) throw new Error(data.error ?? "Could not publish.");

      router.push(data.pageUrl ?? `/components/${draft.name}`);
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
      thumbnailFile={thumbnailFile}
      thumbnailPreview={thumbnailPreview}
      controlCount={tweakableSchema(draft.tweakSchema).length}
      onComponentFile={handleComponentFile}
      onThumbnailFile={handleThumbnailFile}
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
              "px-4 py-3 text-[13px] transition",
              tab === t.id
                ? "border-b border-white text-white"
                : "text-muted hover:text-white"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "details" ? (
        <div className="flex items-start gap-6">
          <div className="grid min-w-0 flex-1 max-w-2xl gap-5">
          <Field label="Display name" hint="Shown on the marketplace card and detail page.">
            <input
              className={inputClass}
              value={draft.displayName}
              onChange={(e) => updateDraft({ displayName: e.target.value })}
              placeholder="Contact Form"
            />
          </Field>

          <Field
            label="Component ID"
            hint={mode === "edit" ? "Cannot change after publishing." : "Used in the page URL."}
          >
            <input
              className={cn(inputClass, mode === "edit" && "opacity-60")}
              value={draft.name}
              disabled={mode === "edit"}
              onChange={(e) => updateDraft({ name: slugify(e.target.value) })}
              placeholder="contact-form"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Category">
              <select
                className={inputClass}
                value={draft.category}
                onChange={(e) =>
                  updateDraft({ category: e.target.value as EditorDraft["category"] })
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Accent color" hint="Fallback when no thumbnail is set.">
              <input
                className={inputClass}
                type="color"
                value={draft.previewAccent}
                onChange={(e) => updateDraft({ previewAccent: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Short description" hint="One line summary for the gallery.">
            <textarea
              className={cn(inputClass, "min-h-[88px] resize-y")}
              value={draft.description}
              onChange={(e) => updateDraft({ description: e.target.value })}
            />
          </Field>

          <Field label="Tags" hint="Comma-separated, e.g. form, dark, framer-motion">
            <input
              className={inputClass}
              value={draft.tags}
              onChange={(e) => updateDraft({ tags: e.target.value })}
            />
          </Field>

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

          <Field label="Key features" hint="One per line — shown on the component page.">
            <textarea
              className={cn(inputClass, "min-h-[100px] resize-y")}
              value={draft.keyFeatures}
              onChange={(e) => updateDraft({ keyFeatures: e.target.value })}
              placeholder={"Animated success state\nLight and dark themes\nFramer-safe"}
            />
          </Field>

          <label className="flex items-center gap-2 text-[14px] text-muted">
            <input
              type="checkbox"
              checked={draft.premium}
              onChange={(e) => updateDraft({ premium: e.target.checked })}
            />
            Mark as featured / premium
          </label>

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-1 text-[13px] text-muted transition hover:text-white"
          >
            <ChevronDown size={14} className={cn("transition", showAdvanced && "rotate-180")} />
            More options
          </button>

          {showAdvanced ? (
            <div className="grid gap-4 border border-stroke bg-surface p-4">
              <Field label="Extra description lines" hint="One per line.">
                <textarea
                  className={cn(inputClass, "min-h-[72px] resize-y")}
                  value={draft.descriptionParagraphs}
                  onChange={(e) => updateDraft({ descriptionParagraphs: e.target.value })}
                />
              </Field>
              <Field label="Related components" hint="Comma-separated IDs.">
                <input
                  className={inputClass}
                  value={draft.related}
                  onChange={(e) => updateDraft({ related: e.target.value })}
                />
              </Field>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setTab("preview")}
            className="h-10 w-fit bg-white px-5 text-[14px] font-medium text-black"
          >
            Continue to preview
          </button>
          </div>
          {filesSidebar}
        </div>
      ) : null}

      {tab === "preview" ? (
        <div className="space-y-6">
          <div className="flex min-h-[480px] gap-4 border border-stroke bg-bg p-4">
            <div className="min-w-0 flex-1">
              {canPreview ? (
                <PreviewFrame
                  name={previewSlug}
                  state={previewState}
                  previewAccent={draft.previewAccent}
                  previewLayout={resolvePreviewLayout({
                    name: previewSlug,
                    category: draft.category,
                    previewLayout: initialEntry?.previewLayout,
                  })}
                />
              ) : (
                <div className="flex h-full min-h-[320px] items-center justify-center text-[14px] text-muted">
                  Upload a component file to see the live preview.
                </div>
              )}
            </div>
            {tweakableControls.length ? (
              <aside className="w-[300px] shrink-0">
                <TweakPanel
                  schema={tweakableControls}
                  state={previewState}
                  onChange={(key, value) =>
                    setPreviewState((s) => ({ ...s, [key]: value }))
                  }
                  onReset={() => setPreviewState(defaults)}
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
          </div>
        </div>
      ) : null}
    </div>
  );
}
