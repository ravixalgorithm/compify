import { useRef, useEffect, type CSSProperties } from "react"
import { addPropertyControls, ControlType, useIsStaticRenderer } from "framer"

interface SnowfallProps {
    preview?: boolean
    count?: number
    speedMin?: number
    speedMax?: number
    wind?: number
    windVariation?: number
    radiusMin?: number
    radiusMax?: number
    opacityMin?: number
    opacityMax?: number
    direction?: "down" | "up"
    color?: string
    background?: string
    transition?: number
    style?: CSSProperties
}

interface Flake {
    x: number
    y: number
    r: number
    vy: number
    vx: number
    phase: number
    sway: number
    alpha: number
}

/**
 * Snowfall
 *
 * A customizable canvas snowfall: density, randomized speed, per-flake wind
 * drift, size and opacity ranges, fall direction, colour and an optional
 * backdrop. Toggle Preview for live snow vs a static scene on the canvas.
 *
 * @framerIntrinsicWidth 700
 * @framerIntrinsicHeight 440
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
export default function Snowfall(props: SnowfallProps) {
    const {
        preview = true,
        count = 160,
        speedMin = 0.6,
        speedMax = 2.4,
        wind = 0.2,
        windVariation = 0.8,
        radiusMin = 1,
        radiusMax = 4,
        opacityMin = 0.3,
        opacityMax = 0.9,
        direction = "down",
        color = "#ffffff",
        background = "rgba(0,0,0,0)",
        transition = 0.3,
        style,
    } = props

    const isStatic = useIsStaticRenderer()
    const containerRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    // Live config read by the loop so colour tweaks don't re-scatter the snow.
    const cfg = useRef({ color, wind, windVariation })
    cfg.current = { color, wind, windVariation }

    useEffect(() => {
        if (typeof window === "undefined") return
        const canvas = canvasRef.current
        const cont = containerRef.current
        if (!canvas || !cont) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        const cv: HTMLCanvasElement = canvas
        const box: HTMLDivElement = cont
        const g: CanvasRenderingContext2D = ctx

        let raf = 0
        let W = 0
        let H = 0
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        let flakes: Flake[] = []
        const rand = (a: number, b: number) => a + Math.random() * (b - a)
        const dirSign = direction === "up" ? -1 : 1

        function build() {
            const r = box.getBoundingClientRect()
            W = Math.max(1, Math.floor(r.width))
            H = Math.max(1, Math.floor(r.height))
            cv.width = Math.floor(W * dpr)
            cv.height = Math.floor(H * dpr)
            cv.style.width = W + "px"
            cv.style.height = H + "px"
            g.setTransform(dpr, 0, 0, dpr, 0, 0)
            const n = Math.max(0, Math.round(count))
            flakes = new Array(n)
            for (let i = 0; i < n; i++) {
                flakes[i] = {
                    x: Math.random() * W,
                    y: Math.random() * H,
                    r: rand(radiusMin, radiusMax),
                    vy: rand(speedMin, speedMax),
                    vx: rand(-1, 1),
                    phase: Math.random() * Math.PI * 2,
                    sway: rand(0.2, 0.9),
                    alpha: rand(opacityMin, opacityMax),
                }
            }
        }

        function draw() {
            g.clearRect(0, 0, W, H)
            g.fillStyle = cfg.current.color
            for (let i = 0; i < flakes.length; i++) {
                const f = flakes[i]
                g.globalAlpha = f.alpha
                g.beginPath()
                g.arc(f.x, f.y, f.r, 0, Math.PI * 2)
                g.fill()
            }
            g.globalAlpha = 1
        }

        function loop(t: number) {
            const { wind: wBase, windVariation: wVar } = cfg.current
            for (let i = 0; i < flakes.length; i++) {
                const f = flakes[i]
                f.y += f.vy * dirSign
                f.x += wBase + f.vx * wVar + Math.sin(t * 0.0012 + f.phase) * f.sway
                if (dirSign > 0 && f.y - f.r > H) {
                    f.y = -f.r
                    f.x = Math.random() * W
                } else if (dirSign < 0 && f.y + f.r < 0) {
                    f.y = H + f.r
                    f.x = Math.random() * W
                }
                if (f.x < -f.r) f.x = W + f.r
                else if (f.x > W + f.r) f.x = -f.r
            }
            draw()
            raf = requestAnimationFrame(loop)
        }

        build()
        draw() // static scene first (also the export/thumbnail frame)
        if (preview) raf = requestAnimationFrame(loop)

        const ro = new ResizeObserver(() => {
            build()
            draw()
        })
        ro.observe(box)

        return () => {
            cancelAnimationFrame(raf)
            ro.disconnect()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preview, count, speedMin, speedMax, radiusMin, radiusMax, opacityMin, opacityMax, direction, isStatic])

    return (
        <div
            ref={containerRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 80,
                minHeight: 80,
                overflow: "hidden",
                background,
                transition: `background-color ${Math.max(0, transition)}s ease`,
                ...style,
            }}
        >
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, display: "block" }} />
        </div>
    )
}

addPropertyControls(Snowfall, {
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: true,
        enabledTitle: "Live",
        disabledTitle: "Static",
    },
    count: { type: ControlType.Number, title: "Count", defaultValue: 160, min: 1, max: 1200, step: 1 },
    speedMin: { type: ControlType.Number, title: "Speed Min", defaultValue: 0.6, min: 0, max: 10, step: 0.1 },
    speedMax: { type: ControlType.Number, title: "Speed Max", defaultValue: 2.4, min: 0, max: 14, step: 0.1 },
    wind: { type: ControlType.Number, title: "Wind", defaultValue: 0.2, min: -5, max: 5, step: 0.1 },
    windVariation: { type: ControlType.Number, title: "Wind Variation", defaultValue: 0.8, min: 0, max: 4, step: 0.1 },
    radiusMin: { type: ControlType.Number, title: "Radius Min", defaultValue: 1, min: 0.5, max: 20, step: 0.5, unit: "px" },
    radiusMax: { type: ControlType.Number, title: "Radius Max", defaultValue: 4, min: 0.5, max: 30, step: 0.5, unit: "px" },
    opacityMin: { type: ControlType.Number, title: "Opacity Min", defaultValue: 0.3, min: 0, max: 1, step: 0.05 },
    opacityMax: { type: ControlType.Number, title: "Opacity Max", defaultValue: 0.9, min: 0, max: 1, step: 0.05 },
    direction: {
        type: ControlType.Enum,
        title: "Direction",
        options: ["down", "up"],
        optionTitles: ["Down", "Up"],
        defaultValue: "down",
        displaySegmentedControl: true,
    },
    color: { type: ControlType.Color, title: "Color", defaultValue: "#ffffff" },
    background: { type: ControlType.Color, title: "Background", defaultValue: "rgba(0,0,0,0)" },
    transition: { type: ControlType.Number, title: "Transition", defaultValue: 0.3, min: 0, max: 2, step: 0.05, unit: "s" },
})
