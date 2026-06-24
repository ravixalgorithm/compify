import * as React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import {
    addPropertyControls,
    ControlType,
    useIsStaticRenderer,
} from "framer"
import {
    animate,
    motion,
    useMotionTemplate,
    useMotionValue,
    useReducedMotion,
    useSpring,
    type SpringOptions,
} from "framer-motion"

/**
 * ShinyButton — a glossy, skeuomorphic button recreated from Verse's "Shiny
 * Button". Three behaviors that were originally separate Framer overrides +
 * variants are folded into one self-contained component:
 *
 *  1. Skeuomorphic gloss styling — a rounded button with a vertical light→dark
 *     gradient face derived from `baseColor`, a bright glossy sheen across the
 *     top, an inset top highlight + inset bottom shadow (inner bevel), a crisp
 *     1px border that's lighter on top / darker on bottom, and a soft outer
 *     drop shadow so it sits on the surface.
 *  2. Cursor-following specular highlight — a soft radial light blob clipped
 *     inside the button that tracks the pointer while hovering and springs
 *     back to center on leave. Original override spring was react-spring
 *     `{ mass: 1, tension: 170, friction: 26 }`; framer-motion uses the same
 *     physical model, so that maps 1:1 to `{ mass: 1, stiffness: 170,
 *     damping: 26 }`. The highlight layer is `pointer-events: none`.
 *  3. Press / scale-on-click — on pointer down, animate to `scale: 0.99,
 *     y: 1.5px`; on up, back to `scale: 1, y: 0`; quick `duration ~0.1s`.
 *     Matches the original `onClick` override numbers exactly.
 *
 * Static renderer (Framer canvas / export): the button is drawn at rest with
 * the specular highlight centered and no pointer listeners. `prefersReducedMotion`
 * keeps the highlight static too (no follow); the press is disabled.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 200
 * @framerIntrinsicHeight 56
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type FontValue =
    | string
    | {
          fontFamily?: string
          fontWeight?: number | string
          fontSize?: number | string
          fontStyle?: string
          letterSpacing?: string | number
          lineHeight?: string | number
      }

type LinkValue =
    | string
    | { href?: string; url?: string; target?: string; webPageId?: string }
    | null
    | undefined

type Props = {
    label: string

    // Typography
    font?: FontValue
    fontSize: number
    fontWeight: number
    textColor: string

    // Surface
    baseColor: string
    glossColor: string
    glossOpacity: number

    // Cursor-follow specular
    highlightColor: string
    highlightSize: number
    highlightOpacity: number

    // Shape / spacing
    cornerRadius: number
    paddingX: number
    paddingY: number

    // Outer shadow
    shadow: boolean
    shadowColor: string
    shadowOpacity: number

    // Navigation
    href?: LinkValue
    openInNewTab: boolean

    // Follow spring tuning (defaults equivalent to tension 170 / friction 26)
    followStiffness: number
    followDamping: number

    // Layout
    width?: string | number
    height?: string | number
    style?: React.CSSProperties
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function resolveDim(
    v: string | number | undefined,
    fallback: string
): string {
    if (v == null) return fallback
    if (typeof v === "number") return `${v}px`
    return v
}

// Resolve a Framer Link control value (or plain string) into an href string.
function resolveHref(link: LinkValue): string {
    if (!link) return ""
    if (typeof link === "string") return link
    if (typeof link === "object") return link.href || link.url || ""
    return ""
}

// Parse any CSS color string into [r, g, b] (0..255). Handles #rgb, #rrggbb,
// #rrggbbaa, rgb()/rgba(). Falls back to a neutral graphite on parse failure.
function parseRGB(input: string): [number, number, number] {
    const fallback: [number, number, number] = [46, 50, 58]
    if (!input || typeof input !== "string") return fallback
    const s = input.trim()

    // Hex
    if (s[0] === "#") {
        let hex = s.slice(1)
        if (hex.length === 3 || hex.length === 4) {
            hex = hex
                .slice(0, 3)
                .split("")
                .map((c) => c + c)
                .join("")
        }
        if (hex.length >= 6) {
            const r = parseInt(hex.slice(0, 2), 16)
            const g = parseInt(hex.slice(2, 4), 16)
            const b = parseInt(hex.slice(4, 6), 16)
            if (![r, g, b].some(Number.isNaN)) return [r, g, b]
        }
        return fallback
    }

    // rgb() / rgba()
    const m = /rgba?\(([^)]+)\)/i.exec(s)
    if (m) {
        const parts = m[1].split(",").map((p) => parseFloat(p.trim()))
        if (parts.length >= 3 && parts.slice(0, 3).every((n) => !Number.isNaN(n)))
            return [parts[0], parts[1], parts[2]]
    }
    return fallback
}

const clamp255 = (n: number) => Math.max(0, Math.min(255, Math.round(n)))

// Lighten / darken an [r,g,b] toward white / black by `amount` (0..1).
function shade(
    rgb: [number, number, number],
    amount: number
): [number, number, number] {
    if (amount >= 0) {
        return [
            clamp255(rgb[0] + (255 - rgb[0]) * amount),
            clamp255(rgb[1] + (255 - rgb[1]) * amount),
            clamp255(rgb[2] + (255 - rgb[2]) * amount),
        ]
    }
    const a = -amount
    return [
        clamp255(rgb[0] * (1 - a)),
        clamp255(rgb[1] * (1 - a)),
        clamp255(rgb[2] * (1 - a)),
    ]
}

const rgbStr = (rgb: [number, number, number]) =>
    `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
const rgbaStr = (rgb: [number, number, number], a: number) =>
    `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a})`

// Pull a usable font-family + extras out of the Font control value.
function resolveFont(font: FontValue | undefined): React.CSSProperties {
    if (!font) return {}
    if (typeof font === "string") return { fontFamily: font }
    const out: React.CSSProperties = {}
    if (font.fontFamily) out.fontFamily = font.fontFamily
    if (font.fontStyle) out.fontStyle = font.fontStyle as any
    if (font.letterSpacing != null)
        out.letterSpacing = font.letterSpacing as any
    if (font.lineHeight != null) out.lineHeight = font.lineHeight as any
    return out
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function ShinyButton(props: Props) {
    const {
        label = "Get Started",
        font,
        fontSize = 16,
        fontWeight = 600,
        textColor = "#FFFFFF",
        baseColor = "#2E323A",
        glossColor = "#FFFFFF",
        glossOpacity = 0.28,
        highlightColor = "#FFFFFF",
        highlightSize = 90,
        highlightOpacity = 0.5,
        cornerRadius = 14,
        paddingX = 24,
        paddingY = 16,
        shadow = true,
        shadowColor = "#000000",
        shadowOpacity = 0.3,
        href,
        openInNewTab = false,
        followStiffness = 170,
        followDamping = 26,
        width = "auto",
        height = "auto",
        style,
    } = props

    const isStatic = useIsStaticRenderer()
    const prefersReducedMotion = useReducedMotion()

    // Follow is live only when we have real interactivity + motion allowed.
    const followEnabled = !isStatic && !prefersReducedMotion

    const containerRef = useRef<HTMLElement | null>(null)

    // --- derived skeuomorphic palette ---------------------------------------
    const palette = useMemo(() => {
        const base = parseRGB(baseColor)
        const top = shade(base, 0.18) // lighter face top
        const bottom = shade(base, -0.16) // darker face bottom
        const borderTop = shade(base, 0.4) // bright bevel top
        const borderBottom = shade(base, -0.4) // dark bevel bottom
        return {
            faceTop: rgbStr(top),
            faceBottom: rgbStr(bottom),
            borderTop: rgbaStr(borderTop, 0.9),
            borderBottom: rgbaStr(borderBottom, 0.9),
            insetTop: "rgba(255,255,255,0.45)", // inner top highlight
            insetBottom: "rgba(0,0,0,0.35)", // inner bottom shadow
        }
    }, [baseColor])

    // --- specular highlight position (spring-followed) ----------------------
    const springCfg = useMemo<SpringOptions>(
        () => ({
            mass: 1,
            stiffness: followStiffness,
            damping: followDamping,
        }),
        [followStiffness, followDamping]
    )

    // Highlight position in PERCENT of the button box (0..100). Rest = center.
    const hx = useMotionValue(50)
    const hy = useMotionValue(50)
    const springX = useSpring(hx, springCfg)
    const springY = useSpring(hy, springCfg)

    // The radial-gradient `background` string follows the spring values.
    const highlightBackground = useMotionTemplate`radial-gradient(${highlightSize}px circle at ${springX}% ${springY}%, ${rgbaStr(
        parseRGB(highlightColor),
        highlightOpacity
    )}, ${rgbaStr(parseRGB(highlightColor), 0)} 70%)`

    // --- press feedback (scale 0.99 / y 1.5px, ~0.1s) -----------------------
    const pressScale = useMotionValue(1)
    const pressY = useMotionValue(0)
    const [pressed, setPressed] = useState(false)

    useEffect(() => {
        if (isStatic || prefersReducedMotion) {
            pressScale.set(1)
            pressY.set(0)
            return
        }
        const opts = { duration: 0.1, ease: "easeOut" as const }
        const a1 = animate(pressScale, pressed ? 0.99 : 1, opts)
        const a2 = animate(pressY, pressed ? 1.5 : 0, opts)
        return () => {
            a1.stop()
            a2.stop()
        }
    }, [pressed, isStatic, prefersReducedMotion, pressScale, pressY])

    // --- pointer follow listeners -------------------------------------------
    useEffect(() => {
        if (!followEnabled) return
        const el = containerRef.current
        if (!el) return

        const onMove = (e: PointerEvent) => {
            const rect = el.getBoundingClientRect()
            if (rect.width === 0 || rect.height === 0) return
            const px = ((e.clientX - rect.left) / rect.width) * 100
            const py = ((e.clientY - rect.top) / rect.height) * 100
            hx.set(Math.max(0, Math.min(100, px)))
            hy.set(Math.max(0, Math.min(100, py)))
        }
        const onLeave = () => {
            // Spring back to center.
            hx.set(50)
            hy.set(50)
        }
        const onUp = () => setPressed(false)

        el.addEventListener("pointermove", onMove)
        el.addEventListener("pointerleave", onLeave)
        el.addEventListener("pointerup", onUp)
        // Also release press if pointer up happens off the element.
        window.addEventListener("pointerup", onUp)

        return () => {
            el.removeEventListener("pointermove", onMove)
            el.removeEventListener("pointerleave", onLeave)
            el.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointerup", onUp)
            setPressed(false)
        }
    }, [followEnabled, hx, hy])

    // --- composed styles -----------------------------------------------------
    const radius = Math.max(0, cornerRadius)

    const faceGradient = `linear-gradient(to bottom, ${palette.faceTop} 0%, ${palette.faceBottom} 100%)`

    // Inner bevel: inset top highlight + inset bottom shadow. Outer drop shadow
    // gated by `shadow`. Order matters — insets first, then the outer shadow.
    const outerShadow = shadow
        ? `, 0 6px 16px ${rgbaStr(parseRGB(shadowColor), shadowOpacity)}, 0 1px 2px ${rgbaStr(
              parseRGB(shadowColor),
              Math.min(1, shadowOpacity + 0.05)
          )}`
        : ""
    const boxShadow = `inset 0 1px 0 0 ${palette.insetTop}, inset 0 -1px 2px 0 ${palette.insetBottom}${outerShadow}`

    const fontStyles = resolveFont(font)

    const rootStyle: React.CSSProperties = {
        // Framer injects width/height via `style`; spread first so our
        // explicit values + visual styling win for the look, but the frame
        // sizing from Framer still flows through for `any`/`fixed`.
        ...style,
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        width: resolveDim(width, "auto"),
        height: resolveDim(height, "auto"),
        padding: `${Math.max(0, paddingY)}px ${Math.max(0, paddingX)}px`,
        borderRadius: radius,
        // Lighter-top / darker-bottom border bevel via a gradient border.
        border: "1px solid transparent",
        borderTopColor: palette.borderTop,
        borderBottomColor: palette.borderBottom,
        borderLeftColor: rgbaStr(parseRGB(baseColor), 0.6),
        borderRightColor: rgbaStr(parseRGB(baseColor), 0.6),
        background: faceGradient,
        boxShadow,
        color: textColor,
        fontSize,
        fontWeight,
        fontFamily:
            (fontStyles.fontFamily as string) ||
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        ...fontStyles,
        lineHeight: 1,
        whiteSpace: "nowrap",
        textDecoration: "none",
        userSelect: "none",
        cursor: "pointer",
        appearance: "none",
        WebkitTapHighlightColor: "transparent",
        overflow: "hidden", // clip gloss + specular to the rounded shape
        willChange: "transform",
    }

    // Top glossy sheen — a brighter band fading down across the upper ~55%.
    const glossStyle: React.CSSProperties = {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "55%",
        borderTopLeftRadius: radius,
        borderTopRightRadius: radius,
        background: `linear-gradient(to bottom, ${rgbaStr(
            parseRGB(glossColor),
            glossOpacity
        )} 0%, ${rgbaStr(parseRGB(glossColor), glossOpacity * 0.35)} 45%, ${rgbaStr(
            parseRGB(glossColor),
            0
        )} 100%)`,
        pointerEvents: "none",
    }

    // Cursor-follow specular layer (or static centered blob).
    const highlightCommon: React.CSSProperties = {
        position: "absolute",
        inset: 0,
        borderRadius: radius,
        pointerEvents: "none",
        mixBlendMode: "screen",
    }

    const staticHighlightStyle: React.CSSProperties = {
        ...highlightCommon,
        background: `radial-gradient(${highlightSize}px circle at 50% 50%, ${rgbaStr(
            parseRGB(highlightColor),
            highlightOpacity
        )}, ${rgbaStr(parseRGB(highlightColor), 0)} 70%)`,
    }

    const content = (
        <>
            <span style={glossStyle} aria-hidden />
            {followEnabled ? (
                <motion.span
                    style={{
                        ...highlightCommon,
                        background: highlightBackground,
                    }}
                    aria-hidden
                />
            ) : (
                <span style={staticHighlightStyle} aria-hidden />
            )}
            <span
                style={{
                    position: "relative",
                    zIndex: 1,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "none",
                }}
            >
                {label}
            </span>
        </>
    )

    // Press handlers (no-ops in static / reduced-motion).
    const onPointerDown = () => {
        if (followEnabled) setPressed(true)
    }

    const resolvedHref = resolveHref(href)

    // Render as a real <a> when a link is provided, otherwise a <button>.
    // Both share identical styling; the press transform lives on a motion
    // wrapper via inline `transform` from the press motion values.
    const motionProps = {
        // Drive scale + y from motion values for the press feedback.
        style: rootStyle as any,
        onPointerDown,
    }

    if (resolvedHref) {
        return (
            <motion.a
                ref={containerRef as React.Ref<HTMLAnchorElement>}
                href={resolvedHref}
                target={openInNewTab ? "_blank" : undefined}
                rel={openInNewTab ? "noopener noreferrer" : undefined}
                {...motionProps}
                style={{
                    ...rootStyle,
                    scale: pressScale,
                    y: pressY,
                }}
            >
                {content}
            </motion.a>
        )
    }

    return (
        <motion.button
            ref={containerRef as React.Ref<HTMLButtonElement>}
            type="button"
            {...motionProps}
            style={{
                ...rootStyle,
                scale: pressScale,
                y: pressY,
            }}
        >
            {content}
        </motion.button>
    )
}

// -----------------------------------------------------------------------------
// Defaults + property controls
// -----------------------------------------------------------------------------

// Defaults live as destructure defaults in ShinyButton (React removed
// defaultProps support for function components). Property-panel defaults below.
addPropertyControls(ShinyButton, {
    label: {
        type: ControlType.String,
        title: "Label",
        defaultValue: "Get Started",
    },
    font: {
        type: ControlType.Font,
        title: "Font",
        controls: "extended",
        defaultFontType: "sans-serif",
    },
    fontSize: {
        type: ControlType.Number,
        title: "Size",
        defaultValue: 16,
        min: 8,
        max: 80,
        step: 1,
        unit: "px",
    },
    fontWeight: {
        type: ControlType.Number,
        title: "Weight",
        defaultValue: 600,
        min: 100,
        max: 900,
        step: 50,
    },
    textColor: {
        type: ControlType.Color,
        title: "Text",
        defaultValue: "#FFFFFF",
    },
    baseColor: {
        type: ControlType.Color,
        title: "Base",
        defaultValue: "#2E323A",
        description:
            "Main face color. The gloss gradient (lighter top, darker bottom) and the bevel border are derived from this.",
    },
    glossColor: {
        type: ControlType.Color,
        title: "Gloss",
        defaultValue: "#FFFFFF",
    },
    glossOpacity: {
        type: ControlType.Number,
        title: "Gloss Opacity",
        defaultValue: 0.28,
        min: 0,
        max: 1,
        step: 0.01,
        description: "Strength of the top sheen.",
    },
    highlightColor: {
        type: ControlType.Color,
        title: "Highlight",
        defaultValue: "#FFFFFF",
        description: "Color of the cursor-following specular blob.",
    },
    highlightSize: {
        type: ControlType.Number,
        title: "Highlight Size",
        defaultValue: 90,
        min: 10,
        max: 400,
        step: 5,
        unit: "px",
        description: "Radius of the cursor-following specular.",
    },
    highlightOpacity: {
        type: ControlType.Number,
        title: "Highlight Opacity",
        defaultValue: 0.5,
        min: 0,
        max: 1,
        step: 0.01,
    },
    cornerRadius: {
        type: ControlType.Number,
        title: "Radius",
        defaultValue: 14,
        min: 0,
        max: 100,
        step: 1,
        unit: "px",
    },
    paddingX: {
        type: ControlType.Number,
        title: "Padding X",
        defaultValue: 24,
        min: 0,
        max: 120,
        step: 1,
        unit: "px",
    },
    paddingY: {
        type: ControlType.Number,
        title: "Padding Y",
        defaultValue: 16,
        min: 0,
        max: 120,
        step: 1,
        unit: "px",
    },
    shadow: {
        type: ControlType.Boolean,
        title: "Drop Shadow",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    shadowColor: {
        type: ControlType.Color,
        title: "Shadow Color",
        defaultValue: "#000000",
        hidden: (p: Partial<Props>) => !p.shadow,
    },
    shadowOpacity: {
        type: ControlType.Number,
        title: "Shadow Opacity",
        defaultValue: 0.3,
        min: 0,
        max: 1,
        step: 0.01,
        hidden: (p: Partial<Props>) => !p.shadow,
    },
    href: {
        type: ControlType.Link,
        title: "Link",
        description:
            "Optional. When set, renders as a styled link instead of a button.",
    },
    openInNewTab: {
        type: ControlType.Boolean,
        title: "New Tab",
        defaultValue: false,
        enabledTitle: "Yes",
        disabledTitle: "No",
        hidden: (p: Partial<Props>) => !resolveHref(p.href),
    },
    followStiffness: {
        type: ControlType.Number,
        title: "Follow Stiffness",
        defaultValue: 170,
        min: 10,
        max: 2000,
        step: 10,
        description:
            "Specular follow spring stiffness (react-spring tension). Default 170.",
    },
    followDamping: {
        type: ControlType.Number,
        title: "Follow Damping",
        defaultValue: 26,
        min: 1,
        max: 100,
        step: 1,
        description:
            "Specular follow spring damping (react-spring friction). Default 26.",
    },
    width: {
        type: ControlType.String,
        title: "Width",
        defaultValue: "auto",
        description:
            'CSS width. "auto" sizes to the label; accepts a number (px) or any CSS length.',
    },
    height: {
        type: ControlType.String,
        title: "Height",
        defaultValue: "auto",
        description:
            'CSS height. "auto" sizes to the label; accepts a number (px) or any CSS length.',
    },
})
