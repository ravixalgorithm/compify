"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Loader2, Upload } from "lucide-react";
import {
  CATEGORIES,
  tweakableSchema,
  type RegistryEntry,
  type TweakState,
} from "@compify/shared";
import { TweakPanel } from "@/components/TweakPanel";
import { PreviewFrame } from "@/components/PreviewFrame";
import { GalleryInlinePreview } from "@/components/GalleryInlinePreview";
import { resolvePreviewLayout } from "@/lib/preview";
import { cn } from "@/lib/cn";
import { parsePropertyControls } from "@/lib/parsePropertyControls";
import {
  draftToRegistryEntry,
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
    previewLayout: entry.previewLayout ? JSON.stringify({ mode: entry.previewLayout }) : undefined,
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

type SurfaceLayoutValue = {
  fit?: string;
  minHeight?: number;
  maxWidth?: number;
  padding?: number;
  align?: string;
};

const numCtrlClass =
  "w-[68px] border border-stroke bg-black px-2 py-1 text-[12px] text-white outline-none focus:border-stroke-hover";

function num(v: string): number | undefined {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
}

/** Per-surface framing controls: fit, height, max width, padding, alignment. */
function SurfaceControls({
  layout,
  onChange,
}: {
  layout?: SurfaceLayoutValue;
  onChange: (patch: SurfaceLayoutValue) => void;
}) {
  const l = layout ?? {};
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border border-stroke bg-surface px-3 py-2 text-[11px]">
      <div className="flex items-center gap-1">
        <span className="mr-1 uppercase tracking-[0.1em] text-muted-foreground">Fit</span>
        {(["auto", "center", "fill", "fit"] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange({ fit: opt })}
            className={cn(
              "border px-2 py-0.5 capitalize transition",
              (l.fit ?? "auto") === opt
                ? "border-white text-white"
                : "border-stroke text-muted hover:text-white",
            )}
          >
            {opt}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-1.5 text-muted">
        Height
        <input
          type="number"
          className={numCtrlClass}
          placeholder="auto"
          value={l.minHeight ?? ""}
          onChange={(e) => onChange({ minHeight: num(e.target.value) })}
        />
      </label>
      <label className="flex items-center gap-1.5 text-muted">
        Max width
        <input
          type="number"
          className={numCtrlClass}
          placeholder="auto"
          value={l.maxWidth ?? ""}
          onChange={(e) => onChange({ maxWidth: num(e.target.value) })}
        />
      </label>
      <label className="flex items-center gap-1.5 text-muted">
        Padding
        <input
          type="number"
          className={numCtrlClass}
          placeholder="0"
          value={l.padding ?? ""}
          onChange={(e) => onChange({ padding: num(e.target.value) })}
        />
      </label>
      <label className="flex items-center gap-1.5 text-muted">
        Align
        <select
          className="border border-stroke bg-black px-2 py-1 text-[12px] text-white outline-none focus:border-stroke-hover"
          value={l.align ?? "center"}
          onChange={(e) => onChange({ align: e.target.value })}
        >
          <option value="top">Top</option>
          <option value="center">Center</option>
          <option value="bottom">Bottom</option>
        </select>
      </label>
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
  const [componentFileName, setComponentFileName] = useState<string | null>(
    initialEntry ? `${initialEntry.name}.tsx` : null,
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Live preview of the uploaded source, compiled on demand to a blob module.
  const [previewModuleUrl, setPreviewModuleUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [compilingPreview, setCompilingPreview] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const defaults = useMemo(() => tweakDefaults(draft.tweakSchema), [draft.tweakSchema]);
  const previewSlug = mode === "edit" ? draft.name : draft.name || draft.templateSlug;
  const tweakableControls = useMemo(
    () => tweakableSchema(draft.tweakSchema),
    [draft.tweakSchema],
  );
  const canPreview = Boolean(draft.source.trim());

  // Per-surface preview framing, parsed from the draft's previewLayout JSON.
  const previewLayoutObj = useMemo<Record<string, any>>(() => {
    if (!draft.previewLayout) return {};
    try {
      return JSON.parse(draft.previewLayout) ?? {};
    } catch {
      return {};
    }
  }, [draft.previewLayout]);

  const previewSurfaces = useMemo<RegistryEntry["previewSurfaces"]>(() => {
    const out: NonNullable<RegistryEntry["previewSurfaces"]> = {};
    (["gallery", "detail", "variant"] as const).forEach((s) => {
      const v = previewLayoutObj[s];
      if (v && typeof v === "object") out[s] = { fit: v.fit ?? "auto", minHeight: v.minHeight };
    });
    return Object.keys(out).length ? out : undefined;
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

  // Synthetic entry carrying the compiled module + per-surface framing, so the
  // admin previews render exactly like the live site.
  const previewEntry = useMemo<RegistryEntry>(
    () => ({
      ...draftToRegistryEntry(draft),
      compiledModuleUrl: previewModuleUrl ?? undefined,
      previewSurfaces,
    }),
    [draft, previewModuleUrl, previewSurfaces],
  );

  useEffect(() => {
    setPreviewState(defaults);
  }, [defaults]);

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
    if (!window.confirm(`Delete "${draft.displayName}"? This removes it from the marketplace and cannot be undone.`)) {
      return;
    }
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

      if (draft.previewLayout) form.append("previewLayout", draft.previewLayout);

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
      controlCount={tweakableSchema(draft.tweakSchema).length}
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
              {!canPreview ? (
                <div className="flex h-full min-h-[320px] items-center justify-center text-[14px] text-muted">
                  Upload a component file to see the live preview.
                </div>
              ) : previewError ? (
                <div className="flex h-full min-h-[320px] items-center justify-center p-6 text-center font-mono text-[12px] leading-relaxed text-red-400">
                  {previewError}
                </div>
              ) : !previewModuleUrl ? (
                <div className="flex h-full min-h-[320px] items-center justify-center gap-2 text-[14px] text-muted">
                  <Loader2 size={16} className="animate-spin" /> Compiling preview…
                </div>
              ) : (
                <div className="space-y-6">
                  <section className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-muted">
                      Detail page
                    </p>
                    <SurfaceControls
                      layout={previewLayoutObj.detail}
                      onChange={(p) => setSurfaceLayout("detail", p)}
                    />
                    <div className="overflow-hidden border border-stroke">
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
                  </section>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <section className="space-y-2">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-muted">
                        Main page · gallery card
                      </p>
                      <SurfaceControls
                        layout={previewLayoutObj.gallery}
                        onChange={(p) => setSurfaceLayout("gallery", p)}
                      />
                      <div className="mx-auto w-full max-w-[340px] overflow-hidden border border-stroke bg-black">
                        <GalleryInlinePreview key={`gallery-${previewModuleUrl}`} entry={previewEntry} surface="gallery" state={previewState} />
                      </div>
                    </section>
                    <section className="space-y-2">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-muted">
                        Variants grid
                      </p>
                      <SurfaceControls
                        layout={previewLayoutObj.variant}
                        onChange={(p) => setSurfaceLayout("variant", p)}
                      />
                      <div className="flex min-h-[180px] w-full max-w-[260px] items-center justify-center overflow-hidden border border-stroke bg-black">
                        <GalleryInlinePreview key={`variant-${previewModuleUrl}`} entry={previewEntry} surface="variant" state={previewState} />
                      </div>
                    </section>
                  </div>
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

            {mode === "edit" ? (
              <button
                type="button"
                onClick={handleDelete}
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
    </div>
  );
}
