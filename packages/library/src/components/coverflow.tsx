import * as React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { addPropertyControls, ControlType, useIsStaticRenderer } from "framer"
import { motion, useReducedMotion } from "framer-motion"

/**
 * CoverflowCarousel — a flat-slat "cover flow" gallery.
 *
 * This is MagneticCarousel's VISUAL (a single horizontal row where the focused
 * item is a big wide/landscape card and every other item is a thin FLAT vertical
 * slat whose height tapers in a smooth exponential curve), but driven by a fixed
 * ACTIVE INDEX + navigation instead of hover. The reference look: a big
 * landscape card centered, flanked by thin flat slats (other images cropped to
 * thin strips) each with a glossy mirrored REFLECTION beneath, plus circular
 * prev/next arrows pinned far-left/right. The slats are FLAT — NO 3D rotation.
 *
 * Sizing model (per item, distance `d = |index - active|`) — the SAME decoupled
 * dock falloff as MagneticCarousel, but anchored on the active index rather than
 * the hovered one:
 *   tWidth(d)  = widthFalloffDecay  ^ d   (STEEP, default 0.16 — only the active
 *                                          item is wide; neighbors stay thin)
 *   tHeight(d) = heightFalloffDecay ^ d   (GENTLE, default 0.74 — the slat
 *                                          tops/bottoms trace a smooth curve)
 *   width  = restWidth  + tWidth'  * (activeWidth  - restWidth)
 *   height = restHeight + tHeight' * (activeHeight - restHeight)
 * The active item (d=0) is always full size (both t=1). Neighbors (d≥1) are
 * scaled by `neighborInfluence` on both dims. Items are vertically centered so
 * the height shrink is symmetric (top/bottom edges fan out smoothly).
 *
 * Centering: the row is translated horizontally so the ACTIVE item's center
 * aligns with the container center. On navigation this animates with a spring,
 * so the focused card slides to center and the row reflows (widths + the
 * translate animate together). Items beyond `falloffRange` each side are not
 * rendered (windowing), but the translate is computed from real cumulative
 * widths so centering stays exact.
 *
 * Navigation (replaces hover):
 * - Circular prev/next arrows decrement/increment the active index. `loop`
 *   wraps. Click any slat → it becomes active (slides to center + expands).
 * - Horizontal drag/swipe past a threshold steps the active index.
 * - Keyboard ←/→ when the component is focused/hovered.
 * - Optional autoplay.
 *
 * Framer adaptations / house style (matches MagneticCarousel.tsx +
 * BoxCarousel.tsx in this folder):
 * - Plain default export, NO forwardRef. `.defaultProps` + `addPropertyControls`
 *   attached below.
 * - `width`/`height` typed `string | number`, concrete numeric defaults
 *   (1000 / 460); `resolveDim` → px / passthrough.
 * - On `useIsStaticRenderer()` we render the resting state with a MIDDLE item
 *   active (big landscape centered + symmetric thin slats + reflections) and NO
 *   listeners/animation, matching reference 161821.
 * - `prefersReducedMotion` collapses the spring to near-instant; arrows still
 *   work.
 * - Reflection is its OWN sub-component (a big conditional-JSX const inside the
 *   render closure trips a spurious tsc TS1005).
 * - Image input pairs a ControlType.Image picker (`src`) with a `srcUrl` String
 *   override; render uses `srcUrl?.trim() || src`.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 1000
 * @framerIntrinsicHeight 460
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type CoverflowImage = {
    /** Framer image-picker value (object with `src`/`srcSet`/`alt`). */
    src?: any
    /** Direct URL override. Wins over `src` when non-empty. */
    srcUrl?: string
    alt?: string
}

type Props = {
    /** Cards. A sensible placeholder set is used when empty. */
    images: CoverflowImage[]

    /** Active card footprint (wide/landscape), in px. */
    activeWidth: number
    activeHeight: number
    /** Thin slat width for non-active items, in px. */
    restWidth: number
    /** Short slat height for far-away items, in px. */
    restHeight: number
    /** Gap between items, in px. */
    gap: number
    /** Corner radius for each item, in px. */
    cornerRadius: number

    /** STEEP per-step WIDTH decay. tWidth = widthFalloffDecay^d. Low = only the
     *  active item widens; neighbors stay thin. */
    widthFalloffDecay: number
    /** GENTLE per-step HEIGHT decay. tHeight = heightFalloffDecay^d. High =
     *  heights curve down gradually across many slats. */
    heightFalloffDecay: number
    /** How many slats each side participate / are rendered. */
    falloffRange: number
    /** 0..1 multiplier on neighbor magnification. 0 = only active sized up. */
    neighborInfluence: number

    /** Wrap past the ends instead of clamping. */
    loop: boolean
    /** Show the circular prev/next arrow buttons. */
    showArrows: boolean
    arrowColor: string
    arrowBackground: string
    arrowSize: number
    /** Soft feathered fade width (px) at the left/right edges so slats fade out
     *  before the arrows instead of overlapping them. 0 = no fade. */
    edgeFade: number
    /** Enable pointer drag / swipe to step the active card. */
    drag: boolean
    /** Autoplay (advances one card per interval). */
    autoplay: boolean
    /** Autoplay interval in seconds. */
    autoplayInterval: number
    /** Card active on first mount (live render only; static centers a middle). */
    startIndex: number
    /** Glossy mirror reflection beneath each card. */
    reflection: boolean

    /** Stage background color. */
    backgroundColor: string

    /** Spring config for the per-item + row-centering transitions. */
    stiffness: number
    damping: number
    mass: number

    /** Container width. Number → px; string passthrough. */
    width: string | number
    /** Container height. Same rules as width. */
    height: string | number
    className: string

    /** Emitted when the active index changes. */
    onIndexChange?: (index: number) => void
    /** Framer-injected style. */
    style?: React.CSSProperties
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const PLACEHOLDER_URLS = [
    "https://picsum.photos/seed/cover1/900/600",
    "https://picsum.photos/seed/cover2/900/600",
    "https://picsum.photos/seed/cover3/900/600",
    "https://picsum.photos/seed/cover4/900/600",
    "https://picsum.photos/seed/cover5/900/600",
    "https://picsum.photos/seed/cover6/900/600",
    "https://picsum.photos/seed/cover7/900/600",
]

// NOTE (memory): never default a ControlType.Image `src` to "". We omit `src`
// entirely on defaults and ship `srcUrl` URLs only, so the items array hydrates.
const DEFAULT_IMAGES: CoverflowImage[] = PLACEHOLDER_URLS.map((url, i) => ({
    srcUrl: url,
    alt: `Coverflow card ${i + 1}`,
}))

// CSS gradient fallbacks (cycled) — shown behind any item with no resolved
// image so it still reads as a slat.
const GRADIENT_FALLBACKS = [
    "linear-gradient(160deg, #ff6b6b, #ffd93d)",
    "linear-gradient(160deg, #4facfe, #00f2fe)",
    "linear-gradient(160deg, #43e97b, #38f9d7)",
    "linear-gradient(160deg, #fa709a, #fee140)",
    "linear-gradient(160deg, #a18cd1, #fbc2eb)",
    "linear-gradient(160deg, #f093fb, #f5576c)",
    "linear-gradient(160deg, #5ee7df, #b490ca)",
]

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function resolveImageSrc(input: any): string {
    if (!input) return ""
    if (typeof input === "string") return input
    if (typeof input === "object" && input.src) return input.src
    return ""
}

function resolveImageSrcSet(input: any): string | undefined {
    if (input && typeof input === "object" && input.srcSet) return input.srcSet
    return undefined
}

// "srcUrl wins over picker" — house-style image input pattern.
function resolveItemSrc(item: CoverflowImage | undefined): string {
    const override = item?.srcUrl && item.srcUrl.trim()
    if (override) return override
    return resolveImageSrc(item?.src)
}

function resolveDim(v: string | number | undefined, fallback: string): string {
    if (v == null) return fallback
    if (typeof v === "number") return `${v}px`
    return v
}

function numericDim(v: string | number | undefined): number | null {
    if (v == null) return null
    if (typeof v === "number") return v
    const trimmed = v.trim()
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) return parseFloat(trimmed)
    const m = /^(-?\d+(\.\d+)?)px$/.exec(trimmed)
    if (m) return parseFloat(m[1])
    return null
}

// Modular index — handles negatives so `prev` from index 0 wraps to the last.
function modIdx(i: number, n: number): number {
    if (n <= 0) return 0
    return ((i % n) + n) % n
}

function classes(...c: Array<string | false | null | undefined>): string {
    return c.filter(Boolean).join(" ")
}

// Smooth EXPONENTIAL dock-style falloff (same as MagneticCarousel). `distance`
// is the index distance from the active item (0 = active itself). Returns a
// factor t ∈ [0, 1] that is 1 at distance 0 and decays geometrically:
//   t(d) = decay ^ d
// `range` is a soft reach limit; beyond it t is forced to 0. A tiny epsilon
// clamps negligible tails to 0.
function falloff(distance: number, range: number, decay: number): number {
    if (distance <= 0) return 1
    if (range > 0 && distance > range) return 0
    const d = Math.max(0.001, Math.min(0.999, decay))
    const t = Math.pow(d, distance)
    return t < 0.004 ? 0 : t
}

type Sizing = {
    restWidth: number
    restHeight: number
    activeWidth: number
    activeHeight: number
    widthFalloffDecay: number
    heightFalloffDecay: number
    falloffRange: number
    neighborInfluence: number
}

// Target width + height for an item at index `i` given the active index.
function sizeForDistance(d: number, s: Sizing): { width: number; height: number } {
    let tWidth = falloff(d, s.falloffRange, s.widthFalloffDecay)
    let tHeight = falloff(d, s.falloffRange, s.heightFalloffDecay)
    if (d > 0) {
        const ni = Math.max(0, Math.min(1, s.neighborInfluence))
        tWidth = tWidth * ni
        tHeight = tHeight * ni
    }
    return {
        width: s.restWidth + tWidth * (s.activeWidth - s.restWidth),
        height: s.restHeight + tHeight * (s.activeHeight - s.restHeight),
    }
}

// -----------------------------------------------------------------------------
// Reflection — glossy mirrored, fading copy of the image beneath a card.
// Extracted to its OWN component (a big conditional-JSX const inside the parent
// render closure trips a spurious tsc TS1005 — keep it a component).
// -----------------------------------------------------------------------------

function Reflection({
    src,
    srcSet,
    width,
    height,
    cornerRadius,
    gradient,
}: {
    src: string
    srcSet?: string
    width: number
    height: number
    cornerRadius: number
    gradient: string
}) {
    // Fade-to-transparent mask + a flipped image, low opacity, sitting just
    // below the card. The reflection box is a fraction of the card height.
    const reflectHeight = Math.max(1, height * 0.45)
    const maskGradient =
        "linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0) 75%)"
    return (
        <div
            aria-hidden
            style={{
                position: "relative",
                width,
                height: reflectHeight,
                marginTop: 6,
                borderRadius: cornerRadius,
                overflow: "hidden",
                transform: "scaleY(-1)",
                WebkitMaskImage: maskGradient,
                maskImage: maskGradient,
                opacity: 0.35,
                background: gradient,
                pointerEvents: "none",
                flex: "0 0 auto",
            }}
        >
            {src ? (
                <img
                    src={src}
                    srcSet={srcSet}
                    alt=""
                    draggable={false}
                    style={{
                        width: "100%",
                        height,
                        objectFit: "cover",
                        objectPosition: "top",
                        display: "block",
                    }}
                />
            ) : null}
        </div>
    )
}

// -----------------------------------------------------------------------------
// Slat — one item (card or thin strip). Flat; width/height animate via motion
// `animate` props so the parent can map without per-item hooks.
// -----------------------------------------------------------------------------

function Slat({
    item,
    index,
    targetWidth,
    targetHeight,
    isActive,
    cornerRadius,
    reflection,
    gradient,
    transition,
    animated,
    onSelect,
}: {
    item: CoverflowImage | undefined
    index: number
    targetWidth: number
    targetHeight: number
    isActive: boolean
    cornerRadius: number
    reflection: boolean
    gradient: string
    transition: any
    animated: boolean
    onSelect: ((index: number) => void) | undefined
}) {
    const src = resolveItemSrc(item)
    const srcSet = resolveImageSrcSet(item?.src)

    const card = (
        <div
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                borderRadius: cornerRadius,
                overflow: "hidden",
                background: gradient,
                boxShadow: isActive
                    ? "0 24px 70px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.06)"
                    : "0 14px 40px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.05)",
            }}
        >
            {src ? (
                <img
                    src={src}
                    srcSet={srcSet}
                    alt={item?.alt || ""}
                    draggable={false}
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                        pointerEvents: "none",
                        userSelect: "none",
                    }}
                />
            ) : null}
        </div>
    )

    const reflectionEl =
        reflection ? (
            <Reflection
                src={src}
                srcSet={srcSet}
                width={targetWidth}
                height={targetHeight}
                cornerRadius={cornerRadius}
                gradient={gradient}
            />
        ) : null

    const column = (
        <>
            <div
                style={{
                    width: targetWidth,
                    height: targetHeight,
                    flex: "0 0 auto",
                }}
            >
                {card}
            </div>
            {reflectionEl}
        </>
    )

    const common: React.CSSProperties = {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        flex: "0 0 auto",
        alignSelf: "center",
        cursor: isActive ? "default" : "pointer",
    }

    if (!animated) {
        return (
            <div
                style={{ ...common, width: targetWidth }}
                onClick={
                    onSelect && !isActive ? () => onSelect(index) : undefined
                }
            >
                {column}
            </div>
        )
    }

    return (
        <motion.div
            style={common}
            initial={false}
            animate={{ width: targetWidth }}
            transition={transition}
            onClick={onSelect && !isActive ? () => onSelect(index) : undefined}
        >
            <motion.div
                style={{ height: targetHeight, flex: "0 0 auto", width: "100%" }}
                initial={false}
                animate={{ width: targetWidth, height: targetHeight }}
                transition={transition}
            >
                {card}
            </motion.div>
            {reflection ? (
                <ReflectionAnimated
                    src={src}
                    srcSet={srcSet}
                    width={targetWidth}
                    height={targetHeight}
                    cornerRadius={cornerRadius}
                    gradient={gradient}
                    transition={transition}
                />
            ) : null}
        </motion.div>
    )
}

// Animated reflection wrapper — separate component so the width/height springs
// live in a stable child (and to keep the big conditional JSX out of the parent
// render closure; see the TS1005 note above).
function ReflectionAnimated({
    src,
    srcSet,
    width,
    height,
    cornerRadius,
    gradient,
    transition,
}: {
    src: string
    srcSet?: string
    width: number
    height: number
    cornerRadius: number
    gradient: string
    transition: any
}) {
    const reflectHeight = Math.max(1, height * 0.45)
    const maskGradient =
        "linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0) 75%)"
    return (
        <motion.div
            aria-hidden
            initial={false}
            animate={{ width, height: reflectHeight }}
            transition={transition}
            style={{
                position: "relative",
                marginTop: 6,
                borderRadius: cornerRadius,
                overflow: "hidden",
                transform: "scaleY(-1)",
                WebkitMaskImage: maskGradient,
                maskImage: maskGradient,
                opacity: 0.35,
                background: gradient,
                pointerEvents: "none",
                flex: "0 0 auto",
            }}
        >
            {src ? (
                <img
                    src={src}
                    srcSet={srcSet}
                    alt=""
                    draggable={false}
                    style={{
                        width: "100%",
                        height,
                        objectFit: "cover",
                        objectPosition: "top",
                        display: "block",
                    }}
                />
            ) : null}
        </motion.div>
    )
}

// -----------------------------------------------------------------------------
// ArrowButton — circular prev/next control pinned to the far left/right.
// -----------------------------------------------------------------------------

function ArrowButton({
    side,
    onClick,
    color,
    background,
    size,
}: {
    side: "left" | "right"
    onClick: () => void
    color: string
    background: string
    size: number
}) {
    const isLeft = side === "left"
    return (
        <button
            type="button"
            aria-label={isLeft ? "Previous" : "Next"}
            onPointerDown={(e) => {
                // Don't let the row's drag handler swallow the click.
                e.stopPropagation()
            }}
            onClick={(e) => {
                e.stopPropagation()
                onClick()
            }}
            style={{
                position: "absolute",
                top: "50%",
                [isLeft ? "left" : "right"]: 24,
                transform: "translateY(-50%)",
                width: size,
                height: size,
                borderRadius: "50%",
                border: "none",
                background,
                color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: 0,
                zIndex: 30,
                boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
                WebkitTapHighlightColor: "transparent",
            }}
        >
            <svg
                width={size * 0.4}
                height={size * 0.4}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ pointerEvents: "none" }}
            >
                {isLeft ? (
                    <polyline points="15 18 9 12 15 6" />
                ) : (
                    <polyline points="9 18 15 12 9 6" />
                )}
            </svg>
        </button>
    )
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function CoverflowCarousel(props: Props) {
    const {
        images: rawImages = DEFAULT_IMAGES,
        activeWidth = 460,
        activeHeight = 300,
        restWidth = 34,
        restHeight = 150,
        gap = 12,
        cornerRadius = 14,
        widthFalloffDecay = 0.16,
        heightFalloffDecay = 0.74,
        falloffRange = 6,
        neighborInfluence = 1,
        loop = true,
        showArrows = true,
        arrowColor = "#ffffff",
        arrowBackground = "rgba(255,255,255,0.12)",
        arrowSize = 56,
        edgeFade = 90,
        drag = true,
        autoplay = false,
        autoplayInterval = 3,
        startIndex = 0,
        reflection = false,
        backgroundColor = "#0a0a0a",
        stiffness = 300,
        damping = 32,
        mass = 1,
        width = 800,
        height = 460,
        className = "",
        onIndexChange,
        style,
    } = props

    const isStatic = useIsStaticRenderer()
    const prefersReducedMotion = useReducedMotion()

    // ---- Items -------------------------------------------------------------
    const images = useMemo(
        () =>
            Array.isArray(rawImages) && rawImages.length > 0
                ? rawImages
                : DEFAULT_IMAGES,
        [rawImages]
    )
    const count = Math.max(1, images.length)

    // ---- Active index ------------------------------------------------------
    const clampStart = Math.min(Math.max(0, startIndex | 0), count - 1)
    const [active, setActive] = useState(clampStart)

    // Keep active in range if the item set shrinks.
    useEffect(() => {
        setActive((a) => Math.min(a, count - 1))
    }, [count])

    const sizing: Sizing = useMemo(
        () => ({
            restWidth,
            restHeight,
            activeWidth,
            activeHeight,
            widthFalloffDecay,
            heightFalloffDecay,
            falloffRange,
            neighborInfluence,
        }),
        [
            restWidth,
            restHeight,
            activeWidth,
            activeHeight,
            widthFalloffDecay,
            heightFalloffDecay,
            falloffRange,
            neighborInfluence,
        ]
    )

    // Spring transition. Reduced motion → near-instant.
    const transition = useMemo(() => {
        if (prefersReducedMotion) return { type: "spring" as const, stiffness: 1200, damping: 90, mass: 0.4 }
        return {
            type: "spring" as const,
            stiffness: Math.max(1, stiffness),
            damping: Math.max(1, damping),
            mass: Math.max(0.05, mass),
        }
    }, [prefersReducedMotion, stiffness, damping, mass])

    // ---- Navigation --------------------------------------------------------
    const goTo = useCallback(
        (idx: number) => {
            setActive((prev) => {
                let nextIdx: number
                if (loop) {
                    nextIdx = modIdx(idx, count)
                } else {
                    nextIdx = Math.min(Math.max(0, idx), count - 1)
                }
                if (nextIdx !== prev) onIndexChange?.(nextIdx)
                return nextIdx
            })
        },
        [loop, count, onIndexChange]
    )

    const goNext = useCallback(() => goTo(active + 1), [goTo, active])
    const goPrev = useCallback(() => goTo(active - 1), [goTo, active])

    // ---- Autoplay ----------------------------------------------------------
    useEffect(() => {
        if (isStatic) return
        if (!autoplay) return
        if (count <= 1) return
        const ms = Math.max(0.2, autoplayInterval) * 1000
        const id = window.setInterval(() => {
            setActive((prev) => {
                const nextIdx = loop
                    ? modIdx(prev + 1, count)
                    : prev + 1 > count - 1
                      ? 0
                      : prev + 1
                if (nextIdx !== prev) onIndexChange?.(nextIdx)
                return nextIdx
            })
        }, ms)
        return () => window.clearInterval(id)
    }, [isStatic, autoplay, autoplayInterval, count, loop, onIndexChange])

    // ---- Keyboard ----------------------------------------------------------
    const isHoveredRef = useRef(false)
    useEffect(() => {
        if (isStatic) return
        const onKey = (e: KeyboardEvent) => {
            if (!isHoveredRef.current) return
            if (e.key === "ArrowLeft") {
                e.preventDefault()
                goPrev()
            } else if (e.key === "ArrowRight") {
                e.preventDefault()
                goNext()
            }
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [isStatic, goPrev, goNext])

    // ---- Drag / swipe ------------------------------------------------------
    const dragRef = useRef<{
        pointerId: number
        startX: number
    } | null>(null)
    const DRAG_THRESHOLD = 60

    const onPointerDown = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            if (!drag || isStatic) return
            if (e.button !== 0 && e.pointerType === "mouse") return
            try {
                e.currentTarget.setPointerCapture(e.pointerId)
            } catch {}
            dragRef.current = { pointerId: e.pointerId, startX: e.clientX }
        },
        [drag, isStatic]
    )

    const endDrag = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            const s = dragRef.current
            if (!s || s.pointerId !== e.pointerId) return
            try {
                e.currentTarget.releasePointerCapture(e.pointerId)
            } catch {}
            const dx = e.clientX - s.startX
            dragRef.current = null
            if (Math.abs(dx) >= DRAG_THRESHOLD) {
                // Drag right → previous (left) card; drag left → next.
                if (dx > 0) goPrev()
                else goNext()
            }
        },
        [goPrev, goNext]
    )

    // ---- Windowed items + row centering ------------------------------------
    // Render only items within `falloffRange` of the active index. Compute the
    // row translateX from REAL cumulative widths so the active item's center
    // lands on the container center regardless of which items are windowed out.
    const viewItems = useMemo(() => {
        const out: { index: number; d: number; width: number; height: number }[] =
            []
        // Render EVERY item in fixed index order — NO windowing and NO wrap-based
        // reordering. This is what makes navigation smooth: each slat keeps a
        // stable key (its index) so it is never remounted or reordered when the
        // active index changes; instead its width/height spring from the old to
        // the new target, so the previous card compresses while the next one
        // expands in one continuous motion. `loop` only affects how prev/next
        // wrap the ACTIVE index, not the visual order.
        for (let idx = 0; idx < count; idx++) {
            const d = Math.abs(idx - active)
            const { width: w, height: h } = sizeForDistance(d, sizing)
            out.push({ index: idx, d, width: w, height: h })
        }
        return out
    }, [active, count, sizing])

    // Offset (px) from the row's left edge to the CENTER of the active item.
    const activeCenterOffset = useMemo(() => {
        let x = 0
        for (let i = 0; i < viewItems.length; i++) {
            const it = viewItems[i]
            if (it.d === 0 && it.index === active) {
                return x + it.width / 2
            }
            x += it.width + gap
        }
        // Fallback (active not in window — shouldn't happen): center of row.
        return x / 2
    }, [viewItems, active, gap])

    // ---- Sizing ------------------------------------------------------------
    const containerStyle: React.CSSProperties = {
        ...style,
        position: "relative",
        width: resolveDim(width, "100%"),
        height: resolveDim(height, "100%"),
        minWidth: numericDim(width) ?? undefined,
        minHeight: numericDim(height) ?? undefined,
        background: backgroundColor,
        overflow: "hidden",
        userSelect: "none",
        touchAction: isStatic ? undefined : "pan-y",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    }

    // ---- Static-renderer short-circuit ------------------------------------
    // On the Framer canvas / export: render the resting state with a MIDDLE item
    // active (big landscape centered + symmetric thin slats with the height
    // curve + reflections), no listeners/animation. Matches reference 161821.
    if (isStatic) {
        const middle = Math.floor(count / 2)
        const span = Math.max(0, falloffRange | 0)
        const staticItems: {
            index: number
            d: number
            width: number
            height: number
        }[] = []
        for (let o = -span; o <= span; o++) {
            const idx = modIdx(middle + o, count)
            if (!loop && (middle + o < 0 || middle + o > count - 1)) continue
            const d = Math.abs(o)
            const { width: w, height: h } = sizeForDistance(d, sizing)
            staticItems.push({ index: idx, d, width: w, height: h })
        }
        return (
            <div
                className={classes("framer-coverflow", className)}
                style={containerStyle}
            >
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        ...(edgeFade > 0
                            ? (() => {
                                  const m = `linear-gradient(to right, transparent 0px, #000 ${edgeFade}px, #000 calc(100% - ${edgeFade}px), transparent 100%)`
                                  return { WebkitMaskImage: m, maskImage: m }
                              })()
                            : {}),
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap,
                        }}
                    >
                        {staticItems.map((it) => {
                            const item = images[it.index]
                            const gradient =
                                GRADIENT_FALLBACKS[
                                    it.index % GRADIENT_FALLBACKS.length
                                ]
                            return (
                                <Slat
                                    key={it.index}
                                    item={item}
                                    index={it.index}
                                    targetWidth={it.width}
                                    targetHeight={it.height}
                                    isActive={it.d === 0}
                                    cornerRadius={cornerRadius}
                                    reflection={reflection}
                                    gradient={gradient}
                                    transition={transition}
                                    animated={false}
                                    onSelect={undefined}
                                />
                            )
                        })}
                    </div>
                </div>
                {showArrows && count > 1 && (
                    <>
                        <ArrowButton
                            side="left"
                            onClick={() => {}}
                            color={arrowColor}
                            background={arrowBackground}
                            size={arrowSize}
                        />
                        <ArrowButton
                            side="right"
                            onClick={() => {}}
                            color={arrowColor}
                            background={arrowBackground}
                            size={arrowSize}
                        />
                    </>
                )}
            </div>
        )
    }

    // ---- Live render -------------------------------------------------------
    return (
        <div
            className={classes("framer-coverflow", className)}
            tabIndex={0}
            onMouseEnter={() => {
                isHoveredRef.current = true
            }}
            onMouseLeave={() => {
                isHoveredRef.current = false
            }}
            onFocus={() => {
                isHoveredRef.current = true
            }}
            onBlur={() => {
                isHoveredRef.current = false
            }}
            style={{ ...containerStyle, outline: "none" }}
            onPointerDown={onPointerDown}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
        >
            {/* Viewport: full-size layer that clips the track and applies a soft
                feathered fade at the left/right edges so slats fade out before the
                arrows instead of overlapping them. Arrows are siblings rendered on
                top, so they stay sharp. */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    overflow: "hidden",
                    ...(edgeFade > 0
                        ? (() => {
                              const m = `linear-gradient(to right, transparent 0px, #000 ${edgeFade}px, #000 calc(100% - ${edgeFade}px), transparent 100%)`
                              return {
                                  WebkitMaskImage: m,
                                  maskImage: m,
                              }
                          })()
                        : {}),
                }}
            >
                {/* Centering wrapper: an absolutely-positioned point at the
                    container center; the row is shifted left by the active item's
                    center offset so the active card sits dead center. */}
                <div
                    style={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        transform: "translateY(-50%)",
                        height: activeHeight,
                        display: "flex",
                        alignItems: "center",
                    }}
                >
                <motion.div
                    initial={false}
                    animate={{ x: -activeCenterOffset }}
                    transition={transition}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap,
                    }}
                >
                    {viewItems.map((it) => {
                        const item = images[it.index]
                        const gradient =
                            GRADIENT_FALLBACKS[
                                it.index % GRADIENT_FALLBACKS.length
                            ]
                        return (
                            <Slat
                                key={it.index}
                                item={item}
                                index={it.index}
                                targetWidth={it.width}
                                targetHeight={it.height}
                                isActive={it.d === 0}
                                cornerRadius={cornerRadius}
                                reflection={reflection}
                                gradient={gradient}
                                transition={transition}
                                animated={true}
                                onSelect={goTo}
                            />
                        )
                    })}
                </motion.div>
                </div>
            </div>

            {showArrows && count > 1 && (
                <>
                    <ArrowButton
                        side="left"
                        onClick={goPrev}
                        color={arrowColor}
                        background={arrowBackground}
                        size={arrowSize}
                    />
                    <ArrowButton
                        side="right"
                        onClick={goNext}
                        color={arrowColor}
                        background={arrowBackground}
                        size={arrowSize}
                    />
                </>
            )}
        </div>
    )
}

// -----------------------------------------------------------------------------
// Defaults + property controls
// -----------------------------------------------------------------------------

// Defaults live as destructure defaults in CoverflowCarousel (React removed
// defaultProps support for function components). Property-panel defaults below.
addPropertyControls(CoverflowCarousel, {
    images: {
        type: ControlType.Array,
        title: "Images",
        maxCount: 40,
        defaultValue: DEFAULT_IMAGES,
        control: {
            type: ControlType.Object,
            controls: {
                src: {
                    type: ControlType.Image,
                    title: "Image",
                },
                srcUrl: {
                    type: ControlType.String,
                    title: "URL",
                    defaultValue: "",
                    placeholder: "https://… (overrides Image)",
                    description:
                        "Direct URL. When non-empty, overrides the Image picker.",
                },
                alt: {
                    type: ControlType.String,
                    title: "Alt",
                    defaultValue: "",
                },
            },
        },
        description:
            "Cards. The active one is a big landscape card; the rest are thin flat slats.",
    },
    activeWidth: {
        type: ControlType.Number,
        title: "Active Width",
        defaultValue: 460,
        min: 120,
        max: 1200,
        step: 1,
        unit: "px",
        description: "Width of the focused (centered) card.",
    },
    activeHeight: {
        type: ControlType.Number,
        title: "Active Height",
        defaultValue: 300,
        min: 80,
        max: 1000,
        step: 1,
        unit: "px",
        description: "Height of the focused card.",
    },
    restWidth: {
        type: ControlType.Number,
        title: "Slat Width",
        defaultValue: 34,
        min: 8,
        max: 200,
        step: 1,
        unit: "px",
        description: "Thin slat width for non-active items.",
    },
    restHeight: {
        type: ControlType.Number,
        title: "Slat Height",
        defaultValue: 150,
        min: 8,
        max: 1000,
        step: 1,
        unit: "px",
        description: "Short slat height for far-away items.",
    },
    gap: {
        type: ControlType.Number,
        title: "Gap",
        defaultValue: 12,
        min: 0,
        max: 80,
        step: 1,
        unit: "px",
    },
    cornerRadius: {
        type: ControlType.Number,
        title: "Corner Radius",
        defaultValue: 14,
        min: 0,
        max: 100,
        step: 1,
        unit: "px",
    },
    widthFalloffDecay: {
        type: ControlType.Number,
        title: "Width Decay",
        defaultValue: 0.16,
        min: 0.05,
        max: 0.9,
        step: 0.01,
        description:
            "STEEP per-step width decay (tWidth = decay^distance). Low = only the active card widens; neighbors stay thin.",
    },
    heightFalloffDecay: {
        type: ControlType.Number,
        title: "Height Decay",
        defaultValue: 0.74,
        min: 0.3,
        max: 0.95,
        step: 0.01,
        description:
            "GENTLE per-step height decay (tHeight = decay^distance). High = slat heights curve down gradually.",
    },
    falloffRange: {
        type: ControlType.Number,
        title: "Falloff Range",
        defaultValue: 6,
        min: 1,
        max: 16,
        step: 1,
        description:
            "How many slats each side participate / are rendered (windowing).",
    },
    neighborInfluence: {
        type: ControlType.Number,
        title: "Neighbor Influence",
        defaultValue: 1,
        min: 0,
        max: 1,
        step: 0.01,
        description:
            "0 = only the active card is sized up. 1 = full spread to neighbors.",
    },
    loop: {
        type: ControlType.Boolean,
        title: "Loop",
        defaultValue: true,
        enabledTitle: "Wrap",
        disabledTitle: "Clamp",
        description: "Wrap past the ends instead of stopping.",
    },
    showArrows: {
        type: ControlType.Boolean,
        title: "Arrows",
        defaultValue: true,
        enabledTitle: "Show",
        disabledTitle: "Hide",
    },
    arrowColor: {
        type: ControlType.Color,
        title: "Arrow Color",
        defaultValue: "#ffffff",
        hidden: (p: Partial<Props>) => !p.showArrows,
    },
    arrowBackground: {
        type: ControlType.Color,
        title: "Arrow BG",
        defaultValue: "rgba(255,255,255,0.12)",
        hidden: (p: Partial<Props>) => !p.showArrows,
    },
    arrowSize: {
        type: ControlType.Number,
        title: "Arrow Size",
        defaultValue: 56,
        min: 24,
        max: 120,
        step: 1,
        unit: "px",
        hidden: (p: Partial<Props>) => !p.showArrows,
    },
    edgeFade: {
        type: ControlType.Number,
        title: "Edge Fade",
        defaultValue: 90,
        min: 0,
        max: 300,
        step: 2,
        unit: "px",
        description:
            "Soft fade at the left/right edges so slats fade out before the arrows.",
    },
    drag: {
        type: ControlType.Boolean,
        title: "Drag",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
        description: "Swipe horizontally past a threshold to step.",
    },
    autoplay: {
        type: ControlType.Boolean,
        title: "Autoplay",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    autoplayInterval: {
        type: ControlType.Number,
        title: "Interval",
        defaultValue: 3,
        min: 0.5,
        max: 20,
        step: 0.5,
        unit: "s",
        hidden: (p: Partial<Props>) => !p.autoplay,
    },
    startIndex: {
        type: ControlType.Number,
        title: "Start Index",
        defaultValue: 0,
        min: 0,
        step: 1,
        description:
            "Card focused on first mount (live render). The canvas preview always centers a middle card.",
    },
    reflection: {
        type: ControlType.Boolean,
        title: "Reflection",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
        description: "Glossy mirror reflection beneath each card.",
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#0a0a0a",
    },
    stiffness: {
        type: ControlType.Number,
        title: "Stiffness",
        defaultValue: 300,
        min: 1,
        max: 1000,
        step: 1,
        description: "Spring stiffness for size + centering transitions.",
    },
    damping: {
        type: ControlType.Number,
        title: "Damping",
        defaultValue: 32,
        min: 1,
        max: 120,
        step: 1,
    },
    mass: {
        type: ControlType.Number,
        title: "Mass",
        defaultValue: 1,
        min: 0.1,
        max: 10,
        step: 0.1,
    },
    width: {
        type: ControlType.Number,
        title: "Width",
        defaultValue: 800,
        min: 1,
        max: 2000,
        step: 1,
        unit: "px",
    },
    height: {
        type: ControlType.Number,
        title: "Height",
        defaultValue: 460,
        min: 1,
        max: 1200,
        step: 1,
        unit: "px",
    },
    className: {
        type: ControlType.String,
        title: "Class Name",
        defaultValue: "",
        description: "Extra CSS classes appended to the container.",
    },
})
