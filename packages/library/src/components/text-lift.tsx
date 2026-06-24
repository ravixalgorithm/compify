import { addPropertyControls, ControlType, useIsStaticRenderer } from "framer"
import { motion } from "framer-motion"
import { useState, type CSSProperties } from "react"

type Dir =
    | "topRight" | "right" | "bottomRight" | "bottom"
    | "bottomLeft" | "left" | "topLeft" | "top"

const DIRS: Record<Dir, { x: number; y: number }> = {
    top: { x: 0, y: -1 },
    topRight: { x: 0.72, y: -0.72 },
    right: { x: 1, y: 0 },
    bottomRight: { x: 0.72, y: 0.72 },
    bottom: { x: 0, y: 1 },
    bottomLeft: { x: -0.72, y: 0.72 },
    left: { x: -1, y: 0 },
    topLeft: { x: -0.72, y: -0.72 },
}

interface TextLiftProps {
    text: string
    frontColor: string
    depthColor: string
    strokeColor: string
    stroke: number
    filled: boolean
    depth: number
    spread: number
    expand: number
    lift: number
    direction: Dir
    fade: boolean
    transition: any
    font: any
    fontSize?: number
    /** Pin letters in the expanded hover pose (gallery / variant previews). */
    preview?: boolean
    style?: CSSProperties
}

function resolveFont(font: any, fontSize?: number): CSSProperties {
    const base: CSSProperties = {
        fontWeight: 700,
        letterSpacing: "-0.02em",
        lineHeight: "1em",
        fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }
    const fromControl = typeof font === "object" && font ? font : {}
    const size =
        fontSize != null
            ? `${fontSize}px`
            : fromControl.fontSize ?? "96px"
    return { ...base, ...fromControl, fontSize: size }
}

function Letter(props: {
    char: string
    depth: number
    spread: number
    expand: number
    lift: number
    dir: { x: number; y: number }
    frontColor: string
    depthColor: string
    strokeColor: string
    stroke: number
    filled: boolean
    fade: boolean
    transition: any
    font: CSSProperties
    isStatic: boolean
    preview: boolean
}) {
    const { char, depth, spread, expand, lift, dir, frontColor, depthColor, strokeColor, stroke, filled, fade, transition, font, isStatic, preview } = props
    const [hover, setHover] = useState(false)
    const on = preview || (hover && !isStatic)
    const space = char === " "

    return (
        <span
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{ position: "relative", display: "inline-block", whiteSpace: "pre", cursor: "default" }}
        >
            {Array.from({ length: depth }).map((_, i) => {
                // i = 0 is the base on the surface (anchored, in flow),
                // i = depth-1 is the front face that lifts off.
                const isBase = i === 0
                const isTop = i === depth - 1
                const denom = depth > 1 ? depth - 1 : 1
                const restS = i * spread
                const hoverS = i * expand + (i / denom) * lift
                const s = on ? hoverS : restS
                const lc = isTop ? frontColor : depthColor
                return (
                    <motion.span
                        key={i}
                        aria-hidden={!isTop}
                        animate={{ x: s * dir.x, y: s * dir.y }}
                        transition={transition || { type: "spring", stiffness: 320, damping: 22 }}
                        style={{
                            position: isBase ? "relative" : "absolute",
                            left: isBase ? undefined : 0,
                            top: isBase ? undefined : 0,
                            color: filled ? lc : "transparent",
                            WebkitTextStrokeWidth: stroke > 0 ? `${stroke}px` : undefined,
                            WebkitTextStrokeColor: stroke > 0 ? strokeColor : undefined,
                            opacity: fade ? Math.max(0.2, 1 - ((depth - 1 - i) / depth) * 0.85) : 1,
                            zIndex: i + 1,
                            display: "inline-block",
                            willChange: "transform",
                            ...font,
                        }}
                    >
                        {space ? " " : char}
                    </motion.span>
                )
            })}
        </span>
    )
}

/**
 * Text Lift on Hover
 *
 * Each letter is a stack of itself, pushed to one side for depth. Hover a letter
 * and its stack expands in that direction, lifting it off the surface.
 *
 * @framerIntrinsicWidth 420
 * @framerIntrinsicHeight 120
 *
 * @framerSupportedLayoutWidth auto
 * @framerSupportedLayoutHeight auto
 */
export default function TextLift(props: TextLiftProps) {
    const {
        text = "STAND",
        frontColor = "#ffffff",
        depthColor = "#888888",
        strokeColor = "#ffffff",
        stroke = 2,
        filled = true,
        depth = 6,
        spread = 4,
        expand = 12,
        lift = 10,
        direction = "topRight",
        fade = false,
        transition,
        font,
        fontSize,
        preview = false,
    } = props

    const isStatic = useIsStaticRenderer()
    const dir = DIRS[direction] || DIRS.topRight
    const chars = text.split("")
    const safeDepth = Math.max(1, Math.round(depth))
    const letterFont = resolveFont(font, fontSize)

    return (
        <div
            style={{
                display: "flex",
                width: "100%",
                alignItems: "center",
                justifyContent: "center",
                overflow: "visible",
            }}
        >
            <div style={{ display: "inline-flex", flexWrap: "wrap", width: "max-content", maxWidth: "100%" }}>
                {chars.map((c, idx) => (
                    <Letter
                        key={idx}
                        char={c}
                        depth={safeDepth}
                        spread={spread}
                        expand={expand}
                        lift={lift}
                        dir={dir}
                        frontColor={frontColor}
                        depthColor={depthColor}
                        strokeColor={strokeColor}
                        stroke={stroke}
                        filled={filled}
                        fade={fade}
                        transition={transition}
                        font={letterFont}
                        isStatic={isStatic}
                        preview={preview}
                    />
                ))}
            </div>
        </div>
    )
}

addPropertyControls(TextLift, {
    text: { type: ControlType.String, title: "Text", defaultValue: "LIFT" },
    direction: {
        type: ControlType.Enum,
        title: "Push",
        options: ["topRight", "right", "bottomRight", "bottom", "bottomLeft", "left", "topLeft", "top"],
        optionTitles: ["Top Right", "Right", "Bottom Right", "Bottom", "Bottom Left", "Left", "Top Left", "Top"],
        defaultValue: "bottomLeft",
    },
    depth: { type: ControlType.Number, title: "Layers", defaultValue: 6, min: 2, max: 16, step: 1 },
    spread: { type: ControlType.Number, title: "Rest Spread", defaultValue: 5, min: 0, max: 20, step: 0.5, unit: "px" },
    expand: { type: ControlType.Number, title: "Hover Spread", defaultValue: 10, min: 0, max: 40, step: 0.5, unit: "px" },
    lift: { type: ControlType.Number, title: "Lift", defaultValue: 8, min: 0, max: 60, step: 1, unit: "px" },
    fade: { type: ControlType.Boolean, title: "Fade Depth", defaultValue: false },
    filled: { type: ControlType.Boolean, title: "Filled", defaultValue: true, enabledTitle: "Solid", disabledTitle: "Outline" },
    stroke: { type: ControlType.Number, title: "Stroke", defaultValue: 2, min: 0, max: 8, step: 0.5, unit: "px" },
    strokeColor: { type: ControlType.Color, title: "Stroke Color", defaultValue: "#ffffff", hidden: (p: any) => p.stroke <= 0 },
    frontColor: { type: ControlType.Color, title: "Front Fill", defaultValue: "#111111", hidden: (p: any) => !p.filled },
    depthColor: { type: ControlType.Color, title: "Depth Fill", defaultValue: "#ffffff", hidden: (p: any) => !p.filled },
    fontSize: {
        type: ControlType.Number,
        title: "Font Size",
        defaultValue: 96,
        min: 12,
        max: 200,
        step: 1,
        unit: "px",
    },
    transition: {
        type: ControlType.Transition,
        title: "Transition",
        defaultValue: { type: "spring", stiffness: 320, damping: 22 },
    },
    font: {
        type: ControlType.Font,
        title: "Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { variant: "Bold", fontSize: "96px", letterSpacing: "-0.02em", lineHeight: "1em" },
    },
})
