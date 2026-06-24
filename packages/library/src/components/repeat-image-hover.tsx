import * as React from "react"
import { useState } from "react"
import {
    addPropertyControls,
    ControlType,
    useIsStaticRenderer,
} from "framer"

/**
 * RepeatImageHover — "Repeat Image Hover Effect".
 *
 * Rests as ONE clean, filled image. On hover the echoed copies smoothly fan
 * OUT into a trail of faded concentric grey pill rings and HOLD open while the
 * cursor stays; on leave they collapse back into the single image. Smooth CSS
 * transitions with a per-layer stagger — no snap-back pulse.
 *
 *   LAYER MODEL (back → front), all the SAME image, absolutely positioned, full
 *   container size, object-fit: cover. Index 0 = rearmost (lowest z-index),
 *   index n-1 = frontmost (the sharp main copy, highest z-index). Each copy is
 *   clipped to the same pill radius so the rings read as nested pills.
 *
 *   REST (collapsed) = a single filled image: the rearmost sits at scale 1 and
 *   fills the pill; every other copy is scaled to 0 (hidden behind it).
 *
 *   HOVER (expanded) = the trail fans out: the front copy shrinks to
 *   `frontScale` and each copy toward the BACK grows LARGER by `scaleStep`, so
 *   the bigger lighter copies fan out around the sharp front one as rings.
 *
 * `effectOn`:
 *   • "hover" (default): filled at rest, trail fans out on hover.
 *   • "rest": inverted — trail visible at rest, collapses to one image on hover.
 *
 * Static renderer (Framer canvas / export): hover listeners are skipped and the
 * EXPANDED frame is pinned so the canvas thumbnail shows the ring trail.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 420
 * @framerIntrinsicHeight 620
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type EaseName = "ease" | "easeOut" | "easeInOut" | "overshoot"

type EffectOn = "rest" | "hover"

type Props = {
    image: { src: string; srcSet?: string; alt?: string } | null
    imageUrl: string

    layers: number
    borderRadius: number

    frontScale: number
    scaleStep: number
    originX: number
    originY: number

    overlayColor: string
    overlayStrength: number

    duration: number
    stagger: number
    easing: EaseName

    effectOn: EffectOn

    width: string | number
    height: string | number
    style?: React.CSSProperties
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function resolveDim(v: string | number | undefined, fallback: string): string {
    if (v == null) return fallback
    if (typeof v === "number") return `${v}px`
    return v
}

const EASES: Record<EaseName, string> = {
    ease: "ease",
    easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
    easeInOut: "cubic-bezier(0.65, 0, 0.35, 1)",
    overshoot: "cubic-bezier(0.34, 1.56, 0.64, 1)",
}

const DEFAULT_IMAGE =
    "https://images.unsplash.com/photo-1488161628813-04466f872be2?q=80&w=840&auto=format&fit=crop"

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function RepeatImageHover(props: Props) {
    const {
        image,
        imageUrl = "",
        layers = 4,
        borderRadius = 180,
        frontScale = 0.72,
        scaleStep = 0.16,
        originX = 50,
        originY = 50,
        overlayColor = "rgba(190,190,195,1)",
        overlayStrength = 0.55,
        duration = 0.6,
        stagger = 0.06,
        easing = "easeOut",
        effectOn = "hover",
        width = 420,
        height = 620,
        style,
    } = props

    const isStatic = useIsStaticRenderer()
    const [hovered, setHovered] = useState(false)

    const src = (imageUrl && imageUrl.trim()) || image?.src || DEFAULT_IMAGE
    const srcSet = imageUrl && imageUrl.trim() ? undefined : image?.srcSet
    const alt = image?.alt || ""

    const n = Math.max(2, Math.min(8, Math.round(layers || 4)))

    // "expanded" = the ring trail is fanned out. For effectOn "hover" that
    // happens on hover (filled at rest); "rest" inverts it. Static pins expanded
    // so the canvas thumbnail shows the trail.
    let expanded: boolean
    if (isStatic) {
        expanded = true
    } else if (effectOn === "rest") {
        expanded = !hovered
    } else {
        expanded = hovered
    }

    const ease = EASES[easing] || EASES.easeInOut
    const transformOrigin = `${originX}% ${originY}%`

    const onEnter = () => {
        if (!isStatic) setHovered(true)
    }
    const onLeave = () => {
        if (!isStatic) setHovered(false)
    }

    const containerStyle: React.CSSProperties = {
        ...style,
        position: "relative",
        width: resolveDim(width, "100%"),
        height: resolveDim(height, "100%"),
        borderRadius,
        overflow: "hidden",
        background: "#0a0a0a",
        cursor: "pointer",
        userSelect: "none",
        WebkitUserSelect: "none",
    }

    return (
        <div
            style={containerStyle}
            onPointerEnter={isStatic ? undefined : onEnter}
            onPointerLeave={isStatic ? undefined : onLeave}
        >
            {Array.from({ length: n }).map((_, i) => {
                const isFront = i === n - 1
                const isBack = i === 0
                const distanceFromFront = n - 1 - i // 0 front, n-1 back

                // EXPANDED: front smallest, each layer toward the back larger →
                // rings fan out. COLLAPSED: rearmost fills (scale 1), rest hidden
                // → single clean image.
                const expandedScale = frontScale + scaleStep * distanceFromFront
                const collapsedScale = isBack ? 1 : 0
                const scale = expanded ? expandedScale : collapsedScale

                // Ghost tint increases toward the back; never tints the sharp
                // front copy. Off when collapsed.
                const overlayOpacityExpanded =
                    n > 1
                        ? overlayStrength * (distanceFromFront / (n - 1))
                        : 0
                const overlayOpacity = expanded ? overlayOpacityExpanded : 0

                // Cascade: expanding fans back→front; collapsing settles
                // front→back.
                const delay = expanded
                    ? i * stagger
                    : distanceFromFront * stagger

                return (
                    <div
                        key={i}
                        aria-hidden={!isFront}
                        style={{
                            position: "absolute",
                            inset: 0,
                            zIndex: i, // 0 rearmost → n-1 frontmost
                            transformOrigin,
                            transform: `scale(${scale})`,
                            transition: `transform ${duration}s ${ease} ${delay}s`,
                            willChange: "transform",
                            pointerEvents: "none",
                            borderRadius,
                            overflow: "hidden",
                        }}
                    >
                        <img
                            src={src}
                            srcSet={srcSet}
                            alt={isFront ? alt : ""}
                            draggable={false}
                            style={{
                                position: "absolute",
                                inset: 0,
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                display: "block",
                                pointerEvents: "none",
                            }}
                        />
                        {/* Lightening ghost tint — strongest on the rearmost
                            ring so the trail reads washed-out grey. */}
                        <div
                            style={{
                                position: "absolute",
                                inset: 0,
                                background: overlayColor,
                                opacity: overlayOpacity,
                                transition: `opacity ${duration}s ${ease} ${delay}s`,
                                pointerEvents: "none",
                            }}
                        />
                    </div>
                )
            })}
        </div>
    )
}

RepeatImageHover.displayName = "Repeat Image Hover"

// -----------------------------------------------------------------------------
// Defaults + property controls
// -----------------------------------------------------------------------------

// Defaults live as destructure defaults in RepeatImageHover (React removed
// defaultProps support for function components). Property-panel defaults below.
addPropertyControls(RepeatImageHover, {
    // ---- Image ------------------------------------------------------------
    image: {
        type: ControlType.Image,
        title: "Image",
    },
    imageUrl: {
        type: ControlType.String,
        title: "Image URL",
        defaultValue: "",
        placeholder: "https://…",
        description: "Overrides the Image control when set.",
    },

    // ---- Layers + shape ---------------------------------------------------
    layers: {
        type: ControlType.Number,
        title: "Layers",
        defaultValue: 4,
        min: 2,
        max: 8,
        step: 1,
        description: "Number of stacked echo copies.",
    },
    borderRadius: {
        type: ControlType.Number,
        title: "Radius",
        defaultValue: 180,
        min: 0,
        max: 400,
        step: 1,
        unit: "px",
        description: "Large enough reads as a pill. Container clips to it.",
    },

    // ---- Trail geometry ---------------------------------------------------
    frontScale: {
        type: ControlType.Number,
        title: "Front Scale",
        defaultValue: 0.72,
        min: 0.3,
        max: 1,
        step: 0.01,
        description:
            "Size of the sharp front copy when fanned out. Smaller = more trail.",
    },
    scaleStep: {
        type: ControlType.Number,
        title: "Scale Step",
        defaultValue: 0.16,
        min: 0,
        max: 0.4,
        step: 0.01,
        description:
            "How much LARGER each layer toward the back is — fans the rings out.",
    },
    originX: {
        type: ControlType.Number,
        title: "Origin X",
        defaultValue: 50,
        min: 0,
        max: 100,
        step: 1,
        unit: "%",
        description: "Transform-origin X — controls fan direction.",
    },
    originY: {
        type: ControlType.Number,
        title: "Origin Y",
        defaultValue: 50,
        min: 0,
        max: 100,
        step: 1,
        unit: "%",
        description: "Transform-origin Y — controls fan direction.",
    },

    // ---- Trail tint -------------------------------------------------------
    overlayColor: {
        type: ControlType.Color,
        title: "Overlay",
        defaultValue: "rgba(190,190,195,1)",
        description: "Lightening tint on the rings (washed grey).",
    },
    overlayStrength: {
        type: ControlType.Number,
        title: "Fade",
        defaultValue: 0.55,
        min: 0,
        max: 1,
        step: 0.05,
        description: "Peak overlay opacity on the rearmost ring.",
    },

    // ---- Transition -------------------------------------------------------
    duration: {
        type: ControlType.Number,
        title: "Duration",
        defaultValue: 0.6,
        min: 0.1,
        max: 3,
        step: 0.05,
        unit: "s",
    },
    stagger: {
        type: ControlType.Number,
        title: "Stagger",
        defaultValue: 0.06,
        min: 0,
        max: 0.4,
        step: 0.01,
        unit: "s",
        description: "Per-layer cascade delay.",
    },
    easing: {
        type: ControlType.Enum,
        title: "Easing",
        options: ["ease", "easeOut", "easeInOut", "overshoot"],
        optionTitles: ["Ease", "Ease Out", "Ease In-Out", "Overshoot"],
        defaultValue: "easeOut",
    },

    // ---- Behaviour --------------------------------------------------------
    effectOn: {
        type: ControlType.Enum,
        title: "Effect On",
        options: ["hover", "rest"],
        optionTitles: ["Hover", "Rest"],
        defaultValue: "hover",
        displaySegmentedControl: true,
        description:
            "Hover: filled at rest, trail fans out on hover. Rest: trail at rest, collapses on hover.",
    },

    // ---- Size -------------------------------------------------------------
    width: {
        type: ControlType.String,
        title: "Width",
        defaultValue: "420",
    },
    height: {
        type: ControlType.String,
        title: "Height",
        defaultValue: "620",
    },
})
