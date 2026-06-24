import { useEffect, useRef, type CSSProperties, type ReactNode, type FocusEventHandler } from "react"
import { addPropertyControls, ControlType, useIsStaticRenderer } from "framer"

class Pixel {
    width: number
    height: number
    ctx: CanvasRenderingContext2D
    x: number
    y: number
    color: string
    speed: number
    size: number
    sizeStep: number
    minSize: number
    maxSizeInteger: number
    maxSize: number
    delay: number
    counter: number
    counterStep: number
    isIdle: boolean
    isReverse: boolean
    isShimmer: boolean

    constructor(
        canvas: HTMLCanvasElement,
        context: CanvasRenderingContext2D,
        x: number,
        y: number,
        color: string,
        speed: number,
        delay: number
    ) {
        this.width = canvas.width
        this.height = canvas.height
        this.ctx = context
        this.x = x
        this.y = y
        this.color = color
        this.speed = this.getRandomValue(0.1, 0.9) * speed
        this.size = 0
        this.sizeStep = Math.random() * 0.4
        this.minSize = 0.5
        this.maxSizeInteger = 2
        this.maxSize = this.getRandomValue(this.minSize, this.maxSizeInteger)
        this.delay = delay
        this.counter = 0
        this.counterStep = Math.random() * 4 + (this.width + this.height) * 0.01
        this.isIdle = false
        this.isReverse = false
        this.isShimmer = false
    }

    getRandomValue(min: number, max: number) {
        return Math.random() * (max - min) + min
    }

    draw() {
        const centerOffset = this.maxSizeInteger * 0.5 - this.size * 0.5
        this.ctx.fillStyle = this.color
        this.ctx.fillRect(this.x + centerOffset, this.y + centerOffset, this.size, this.size)
    }

    appear() {
        this.isIdle = false
        if (this.counter <= this.delay) {
            this.counter += this.counterStep
            return
        }
        if (this.size >= this.maxSize) {
            this.isShimmer = true
        }
        if (this.isShimmer) {
            this.shimmer()
        } else {
            this.size += this.sizeStep
        }
        this.draw()
    }

    disappear() {
        this.isShimmer = false
        this.counter = 0
        if (this.size <= 0) {
            this.isIdle = true
            return
        } else {
            this.size -= 0.1
        }
        this.draw()
    }

    shimmer() {
        if (this.size >= this.maxSize) {
            this.isReverse = true
        } else if (this.size <= this.minSize) {
            this.isReverse = false
        }
        if (this.isReverse) {
            this.size -= this.speed
        } else {
            this.size += this.speed
        }
    }
}

function getEffectiveSpeed(value: number, reducedMotion: boolean) {
    const min = 0
    const max = 100
    const throttle = 0.001

    if (value <= min || reducedMotion) {
        return min
    } else if (value >= max) {
        return max * throttle
    } else {
        return value * throttle
    }
}

// --- Colour helpers: derive a 3-shade pixel palette from one picked colour ---
function hexToRgb(hex: string) {
    let h = hex.replace("#", "")
    if (h.length === 3) h = h.split("").map((c) => c + c).join("")
    const n = parseInt(h.slice(0, 6), 16)
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function rgbToHsl(r: number, g: number, b: number) {
    r /= 255
    g /= 255
    b /= 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2
    const d = max - min
    if (d !== 0) {
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
        else if (max === g) h = (b - r) / d + 2
        else h = (r - g) / d + 4
        h *= 60
    }
    return { h, s: s * 100, l: l * 100 }
}

function parseToHsl(input: string) {
    if (!input) return null
    const s = input.trim()
    if (s.startsWith("#")) {
        const { r, g, b } = hexToRgb(s)
        return rgbToHsl(r, g, b)
    }
    let m = s.match(/hsla?\(([^)]+)\)/i)
    if (m) {
        const p = m[1].split(",").map((x) => parseFloat(x))
        return { h: p[0], s: p[1], l: p[2] }
    }
    m = s.match(/rgba?\(([^)]+)\)/i)
    if (m) {
        const p = m[1].split(",").map((x) => parseFloat(x))
        return rgbToHsl(p[0], p[1], p[2])
    }
    return null
}

function hslToHex(h: number, s: number, l: number) {
    s /= 100
    l /= 100
    const k = (n: number) => (n + h / 30) % 12
    const a = s * Math.min(l, 1 - l)
    const f = (n: number) =>
        l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
    const toHex = (x: number) =>
        Math.round(x * 255)
            .toString(16)
            .padStart(2, "0")
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`
}

function deriveColors(input: string) {
    const hsl = parseToHsl(input)
    if (!hsl) return "#fecdd3,#fda4af,#e11d48"
    const { h, s, l } = hsl
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
    const light = hslToHex(h, clamp(s * 0.85, 0, 100), clamp(l + 12, 0, 96))
    const mid = hslToHex(h, clamp(s, 0, 100), clamp(l, 0, 92))
    const dark = hslToHex(h, clamp(s * 1.05, 0, 100), clamp(l - 30, 18, 90))
    return `${light},${mid},${dark}`
}

interface PixelCardProps {
    color?: string
    gap?: number
    speed?: number
    noFocus?: boolean
    borderColor?: string
    radius?: number
    label?: string
    labelColor?: string
    labelFont?: CSSProperties
    children?: ReactNode
    /** Pin the hovered pixel field for marketplace / gallery previews. */
    preview?: boolean
    style?: CSSProperties
}

/**
 * Pixel Card
 *
 * A canvas grid of pixels that grows in on hover and shimmers, then shrinks out
 * on leave. Based on the React Bits PixelCard (pink variant) by David Haz, with
 * a single colour control that derives the 3-shade pixel palette.
 *
 * @framerIntrinsicWidth 300
 * @framerIntrinsicHeight 400
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
export default function PixelCard(props: PixelCardProps) {
    const {
        color = "#fda4af",
        gap = 6,
        speed = 80,
        noFocus = true,
        borderColor = "#27272a",
        radius = 25,
        label = "",
        labelColor = "#ffffff",
        labelFont,
        children,
        preview = false,
        style,
    } = props

    const isStatic = useIsStaticRenderer()
    const showcase = isStatic || preview
    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const pixelsRef = useRef<Pixel[]>([])
    const animationRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null)
    const timePreviousRef = useRef(typeof performance !== "undefined" ? performance.now() : 0)
    const reducedMotion = useRef(
        typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ).current

    const finalGap = gap
    const finalSpeed = speed
    const finalColors = deriveColors(color)
    const finalNoFocus = noFocus

    const initPixels = () => {
        if (!containerRef.current || !canvasRef.current) return

        const rect = containerRef.current.getBoundingClientRect()
        const width = Math.floor(rect.width)
        const height = Math.floor(rect.height)
        const ctx = canvasRef.current.getContext("2d")

        canvasRef.current.width = width
        canvasRef.current.height = height
        canvasRef.current.style.width = `${width}px`
        canvasRef.current.style.height = `${height}px`

        const colorsArray = finalColors.split(",")
        const pxs: Pixel[] = []
        for (let x = 0; x < width; x += parseInt(finalGap.toString(), 10)) {
            for (let y = 0; y < height; y += parseInt(finalGap.toString(), 10)) {
                const c = colorsArray[Math.floor(Math.random() * colorsArray.length)]

                const dx = x - width / 2
                const dy = y - height / 2
                const distance = Math.sqrt(dx * dx + dy * dy)
                const delay = reducedMotion ? 0 : distance
                if (!ctx) return
                pxs.push(
                    new Pixel(
                        canvasRef.current,
                        ctx,
                        x,
                        y,
                        c,
                        getEffectiveSpeed(finalSpeed, reducedMotion),
                        delay
                    )
                )
            }
        }
        pixelsRef.current = pxs
    }

    const drawStaticFrame = () => {
        const ctx = canvasRef.current?.getContext("2d")
        if (!ctx || !canvasRef.current) return
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        for (const pixel of pixelsRef.current) {
            pixel.size = pixel.maxSize
            pixel.draw()
        }
    }

    const doAnimate = (fnName: keyof Pixel) => {
        animationRef.current = requestAnimationFrame(() => doAnimate(fnName))
        const timeNow = performance.now()
        const timePassed = timeNow - timePreviousRef.current
        const timeInterval = 1000 / 60

        if (timePassed < timeInterval) return
        timePreviousRef.current = timeNow - (timePassed % timeInterval)

        const ctx = canvasRef.current?.getContext("2d")
        if (!ctx || !canvasRef.current) return

        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)

        let allIdle = true
        for (let i = 0; i < pixelsRef.current.length; i++) {
            const pixel = pixelsRef.current[i]
            // @ts-ignore
            pixel[fnName]()
            if (!pixel.isIdle) {
                allIdle = false
            }
        }
        if (allIdle) {
            cancelAnimationFrame(animationRef.current as number)
        }
    }

    const handleAnimation = (name: keyof Pixel) => {
        if (animationRef.current !== null) {
            cancelAnimationFrame(animationRef.current)
        }
        animationRef.current = requestAnimationFrame(() => doAnimate(name))
    }

    const onMouseEnter = () => handleAnimation("appear")
    const onMouseLeave = () => handleAnimation("disappear")
    const onFocus: FocusEventHandler<HTMLDivElement> = (e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return
        handleAnimation("appear")
    }
    const onBlur: FocusEventHandler<HTMLDivElement> = (e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return
        handleAnimation("disappear")
    }

    // Framer static renders and reduced-motion users get a drawn-in static frame;
    // web previews auto-run the grow-in + shimmer so the field looks alive rather
    // than frozen (hover never fires in a marketplace/gallery preview).
    const renderPreview = () => {
        if (isStatic || reducedMotion) {
            drawStaticFrame()
        } else if (preview) {
            handleAnimation("appear")
        }
    }

    useEffect(() => {
        initPixels()
        renderPreview()
        const observer = new ResizeObserver(() => {
            initPixels()
            renderPreview()
        })
        if (containerRef.current) {
            observer.observe(containerRef.current)
        }
        return () => {
            observer.disconnect()
            if (animationRef.current !== null) {
                cancelAnimationFrame(animationRef.current)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [finalGap, finalSpeed, finalColors, finalNoFocus, showcase])

    const rootStyle: CSSProperties = {
        position: "relative",
        width: "100%",
        height: "100%",
        minWidth: 80,
        minHeight: 80,
        overflow: "hidden",
        display: "grid",
        placeItems: "center",
        border: `1px solid ${borderColor}`,
        borderRadius: radius,
        isolation: "isolate",
        userSelect: "none",
        transition: "border-color 0.2s cubic-bezier(0.5,1,0.89,1)",
        ...(style || {}),
    }

    return (
        <div
            ref={containerRef}
            style={rootStyle}
            onMouseEnter={showcase ? undefined : onMouseEnter}
            onMouseLeave={showcase ? undefined : onMouseLeave}
            onFocus={showcase || finalNoFocus ? undefined : onFocus}
            onBlur={showcase || finalNoFocus ? undefined : onBlur}
            tabIndex={finalNoFocus ? -1 : 0}
        >
            <canvas
                ref={canvasRef}
                style={{ width: "100%", height: "100%", display: "block", gridArea: "1 / 1" }}
            />
            {(label || children) && (
                <div
                    style={{
                        gridArea: "1 / 1",
                        position: "relative",
                        zIndex: 1,
                        display: "grid",
                        placeItems: "center",
                        pointerEvents: "none",
                    }}
                >
                    {children}
                    {label ? (
                        <span
                            style={{
                                color: labelColor,
                                fontSize: 22,
                                fontWeight: 600,
                                letterSpacing: "-0.01em",
                                ...(labelFont || {}),
                            }}
                        >
                            {label}
                        </span>
                    ) : null}
                </div>
            )}
        </div>
    )
}

addPropertyControls(PixelCard, {
    color: {
        type: ControlType.Color,
        title: "Color",
        defaultValue: "#fda4af",
    },
    gap: {
        type: ControlType.Number,
        title: "Gap",
        defaultValue: 6,
        min: 1,
        max: 30,
        step: 1,
    },
    speed: {
        type: ControlType.Number,
        title: "Speed",
        defaultValue: 80,
        min: 0,
        max: 100,
        step: 1,
    },
    noFocus: {
        type: ControlType.Boolean,
        title: "No Focus",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    borderColor: {
        type: ControlType.Color,
        title: "Border",
        defaultValue: "#27272a",
    },
    radius: {
        type: ControlType.Number,
        title: "Radius",
        defaultValue: 25,
        min: 0,
        max: 60,
        step: 1,
        unit: "px",
    },
    label: {
        type: ControlType.String,
        title: "Label",
        defaultValue: "",
        placeholder: "Optional centered text",
    },
    labelColor: {
        type: ControlType.Color,
        title: "Label Color",
        defaultValue: "#ffffff",
        hidden: ({ label }: any) => !label,
    },
    labelFont: {
        type: ControlType.Font,
        title: "Label Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: {
            variant: "Semibold",
            fontSize: "22px",
            letterSpacing: "-0.01em",
        },
        hidden: ({ label }: any) => !label,
    },
    children: {
        type: ControlType.Slot,
        title: "Content",
    },
})
