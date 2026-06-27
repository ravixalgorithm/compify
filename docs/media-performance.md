# Known issue: slow gallery media on cold load (R2 `r2.dev` throttling)

**Status:** diagnosed, fix deferred.
**Symptom:** On a full page reload, gallery/variant thumbnails (images + videos)
take a long time to appear and the skeletons linger. After you open one component
and navigate back (client-side nav, no reload), everything is instant.

---

## Root cause

Two things compound:

1. **Throttled origin.** Gallery/variant media is served from Cloudflare R2's
   **public development URL** `https://pub-<hash>.r2.dev/...`
   (currently `pub-723ad960cdcf4b19962f84b3e788e982.r2.dev`). Cloudflare
   **deliberately rate-limits `r2.dev`** — it is explicitly *not* meant for
   production traffic. Measured cold-load times: **17–26 seconds per file.**

2. **Large unoptimized files.** Media is stored as uploaded, with no resize /
   recompression. Example: `components/gallery-gallery.png` is **1.67 MB**
   (`Content-Length: 1670840`) for a card thumbnail. The gallery renders raw
   `<img>` / `<video>` (not `next/image`), so the full-size file is downloaded.

### Why warm navigation is instant
Uploads set `Cache-Control: public, max-age=31536000, immutable`
(`apps/web/lib/server/r2.ts`), so once a file is fetched the browser caches it.
Client-side nav re-uses the cache → instant. A **full reload** re-requests from
the throttled origin → slow. (The cache headers are correct; the origin is the
problem.)

### Evidence (measured 2026-06-27, home page)
```
host pub-723ad960cdcf4b19962f84b3e788e982.r2.dev:
  gallery-gallery.png        26,403 ms
  curvegallery-gallery.png   17,489 ms
  scramble-gallery.png        2,520 ms
  random-gallery.mp4          1,318 ms
host images.unsplash.com (component-internal images): ~342 ms  ← fine
HEAD pub-*.r2.dev/.../gallery-gallery.png → Content-Length: 1670840 (1.67 MB)
```

---

## Fix options

### Option A — Custom domain on the R2 bucket (recommended; complete fix)
Removes the `r2.dev` throttling for **images and videos, existing and new**, with
no re-upload. ~2 minutes of Cloudflare setup.

1. Cloudflare dashboard → **R2** → the bucket → **Settings → Public access →
   Custom Domains** → add a domain you control (e.g. `cdn.<yourdomain>`).
   Cloudflare provisions the DNS + CDN.
2. Set **`R2_PUBLIC_URL`** to the new domain (e.g. `https://cdn.<yourdomain>`)
   in **Vercel project env (web)** and in `apps/web/.env.local`.
   - New uploads automatically use it (`r2PublicUrl()` in `lib/server/r2.ts`).
3. Rewrite the host in **already-stored** URLs (one-time, Supabase SQL editor):
   ```sql
   update public.components
     set gallery_media_url = replace(
       gallery_media_url,
       'https://pub-723ad960cdcf4b19962f84b3e788e982.r2.dev',
       'https://cdn.YOURDOMAIN')
     where gallery_media_url like 'https://pub-723ad960cdcf4b19962f84b3e788e982.r2.dev%';

   update public.components
     set variant_media_url = replace(
       variant_media_url,
       'https://pub-723ad960cdcf4b19962f84b3e788e982.r2.dev',
       'https://cdn.YOURDOMAIN')
     where variant_media_url like 'https://pub-723ad960cdcf4b19962f84b3e788e982.r2.dev%';
   ```
   (Adjust the `pub-…r2.dev` host if the bucket's public hash differs. The `?v=`
   cache-bust query is preserved by `replace`.)

Files stay 1.67 MB, but over a real CDN that loads in ~1–2 s instead of 17–26 s.
Pair with Option B for best results.

### Option B — Optimize media on upload (code-only; no infra)
Shrinks new files (e.g. 1.67 MB → ~100–150 KB), helping even on `r2.dev`.

- Add an image-processing lib (`sharp` — works on Vercel's Node runtime; not
  currently a dependency).
- In the upload route `apps/web/app/api/admin/components/route.ts` (`uploadMedia`),
  resize images to a sane max width (~1000–1200px) and re-encode to WebP before
  `uploadToR2`. Leave videos as-is (server-side transcode is heavier — instead
  enforce a size cap and document recommended export settings).
- One-time: re-compress the existing few files (download → resize → re-upload).
  Note: downloading from `r2.dev` is slow but it's a one-off script.

Does **not** remove the `r2.dev` throttling — combine with Option A for instant
loads. On its own it brings cold loads from ~26 s down to ~2–3 s.

### Option C — Proxy images through Vercel image optimization (code-only)
Point gallery images at `/_next/image?url=<r2-url>&w=828&q=70` (add the R2 host to
`images.remotePatterns` in `next.config.mjs`). Vercel resizes + serves from its
CDN, cached after the first request. **Risk:** the first optimization fetch pulls
the source from throttled `r2.dev` server-side and could be slow / time out;
videos can't be optimized this way. Lower priority than A/B.

---

## Recommendation
Do **Option A** (custom domain) as the primary fix, and **Option B** (on-upload
compression) as a follow-up so files are also small. Option A alone resolves the
reported symptom.

## Files involved
- `apps/web/lib/server/r2.ts` — R2 client, `r2PublicUrl()`, `R2_PUBLIC_URL`, cache headers.
- `apps/web/app/api/admin/components/route.ts` — `uploadMedia()` (where compression would go).
- `apps/web/components/MediaThumb.tsx` — renders gallery/variant media (`<img>`/`<video>`, lazy-load).
- `apps/web/components/GalleryCardMedia.tsx` — chooses uploaded media vs live preview.
- `components.gallery_media_url` / `components.variant_media_url` — stored public URLs.
