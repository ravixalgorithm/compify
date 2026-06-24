import {
    addPropertyControls,
    ControlType,
    useIsStaticRenderer,
} from "framer"
import { animate, motion, useInView } from "framer-motion"
import {
    useEffect,
    useRef,
    useState,
    type CSSProperties,
} from "react"

interface BarItem {
    label: string
    percent: number
    color: string
}

interface AnimatedBarsProps {
    bars: BarItem[]
    trackColor: string
    barHeight: number
    radius: number
    gap: number
    labelColor: string
    numberColor: string
    labelFont: any
    numberFont: any
    suffix: string
    decimals: number
    duration: number
    replay: boolean
    background: string
    padding: string
    /** Marketplace gallery: pin bars at target fill without scroll trigger. */
    preview?: boolean
    style?: CSSProperties
}

interface BarProps {
    item: BarItem
    trackColor: string
    barHeight: number
    radius: number
    labelColor: string
    numberColor: string
    labelFont: any
    numberFont: any
    suffix: string
    decimals: number
    duration: number
    active: boolean
    isStatic: boolean
    preview: boolean
}

function Bar(props: BarProps) {
    const {
        item,
        trackColor,
        barHeight,
        radius,
        labelColor,
        numberColor,
        labelFont,
        numberFont,
        suffix,
        decimals,
        duration,
        active,
        isStatic,
        preview,
    } = props

    const target = Math.max(0, Math.min(100, item.percent))
    const pinned = isStatic || preview
    const [val, setVal] = useState(pinned ? target : 0)

    useEffect(() => {
        if (pinned) {
            setVal(target)
            return
        }
        if (!active) {
            setVal(0)
            return
        }
        const controls = animate(0, target, {
            duration,
            ease: [0.22, 1, 0.36, 1],
            onUpdate: (v) => setVal(v),
        })
        return () => controls.stop()
    }, [active, target, duration, pinned])

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                width: "100%",
            }}
        >
            <span
                style={{
                    color: labelColor,
                    ...labelFont,
                }}
            >
                {item.label}
            </span>
            <div
                style={{
                    position: "relative",
                    width: "100%",
                    height: barHeight,
                    borderRadius: radius,
                    background: trackColor,
                    overflow: "hidden",
                }}
            >
                <motion.div
                    style={{
                        height: "100%",
                        width: `${val}%`,
                        borderRadius: radius,
                        background: item.color,
                    }}
                />
            </div>
            <span
                style={{
                    color: numberColor,
                    fontVariantNumeric: "tabular-nums",
                    fontFeatureSettings: '"tnum"',
                    ...numberFont,
                }}
            >
                {val.toFixed(decimals)}
                {suffix}
            </span>
        </div>
    )
}

/**
 * AnimatedBars
 *
 * Scroll-triggered progress bars. Each bar's fill and its number count up
 * from 0 to the target when the group scrolls into view — all in code, no
 * variants or scroll-variant effects required.
 *
 * @framerIntrinsicWidth 440
 * @framerIntrinsicHeight 440
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
export default function AnimatedBars(props: AnimatedBarsProps) {
    const {
        bars = [
            { label: "YouTube", percent: 67, color: "#2b7fff" },
            { label: "Instagram", percent: 48, color: "#e1306c" },
            { label: "X", percent: 82, color: "#e7e7ea" },
        ],
        trackColor = "#2b2b31",
        barHeight = 46,
        radius = 12,
        gap = 28,
        labelColor = "#e9e9ec",
        numberColor = "#ffffff",
        labelFont = { fontSize: 18, fontWeight: 500 },
        numberFont = { fontSize: 24, fontWeight: 800 },
        suffix = "%",
        decimals = 0,
        duration = 1.4,
        replay = false,
        background = "rgba(0,0,0,0)",
        padding = "0px",
        preview = false,
    } = props

    const isStatic = useIsStaticRenderer()
    const ref = useRef<HTMLDivElement>(null)
    const inView = useInView(ref, { once: !replay, amount: 0.5 })
    const active = isStatic || preview || inView

    return (
        <div
            ref={ref}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap,
                padding,
                background,
                ...props.style,
            }}
        >
            {bars.map((item, i) => (
                <Bar
                    key={`${item.label}-${i}`}
                    item={item}
                    trackColor={trackColor}
                    barHeight={barHeight}
                    radius={radius}
                    labelColor={labelColor}
                    numberColor={numberColor}
                    labelFont={labelFont}
                    numberFont={numberFont}
                    suffix={suffix}
                    decimals={decimals}
                    duration={duration}
                    active={active}
                    isStatic={isStatic}
                    preview={preview}
                />
            ))}
        </div>
    )
}

addPropertyControls(AnimatedBars, {
    bars: {
        type: ControlType.Array,
        title: "Bars",
        control: {
            type: ControlType.Object,
            controls: {
                label: {
                    type: ControlType.String,
                    title: "Label",
                    defaultValue: "YouTube",
                },
                percent: {
                    type: ControlType.Number,
                    title: "Percent",
                    defaultValue: 67,
                    min: 0,
                    max: 100,
                    step: 1,
                    unit: "%",
                },
                color: {
                    type: ControlType.Color,
                    title: "Fill",
                    defaultValue: "#2b7fff",
                },
            },
        },
        defaultValue: [
            { label: "YouTube", percent: 67, color: "#2b7fff" },
            { label: "Instagram", percent: 48, color: "#e1306c" },
            { label: "X", percent: 82, color: "#e7e7ea" },
        ],
    },
    trackColor: {
        type: ControlType.Color,
        title: "Track",
        defaultValue: "#2b2b31",
    },
    barHeight: {
        type: ControlType.Number,
        title: "Bar Height",
        defaultValue: 46,
        min: 8,
        max: 120,
        step: 1,
        unit: "px",
    },
    radius: {
        type: ControlType.Number,
        title: "Radius",
        defaultValue: 12,
        min: 0,
        max: 60,
        step: 1,
        unit: "px",
    },
    gap: {
        type: ControlType.Number,
        title: "Gap",
        defaultValue: 28,
        min: 0,
        max: 80,
        step: 1,
        unit: "px",
    },
    labelColor: {
        type: ControlType.Color,
        title: "Label Color",
        defaultValue: "#e9e9ec",
    },
    numberColor: {
        type: ControlType.Color,
        title: "Number Color",
        defaultValue: "#ffffff",
    },
    labelFont: {
        type: ControlType.Font,
        title: "Label Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: {
            fontSize: "18px",
            variant: "Medium",
            letterSpacing: "-0.01em",
            lineHeight: "1em",
        },
    },
    numberFont: {
        type: ControlType.Font,
        title: "Number Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: {
            fontSize: "24px",
            variant: "Bold",
            letterSpacing: "-0.02em",
            lineHeight: "1em",
        },
    },
    suffix: {
        type: ControlType.String,
        title: "Suffix",
        defaultValue: "%",
    },
    decimals: {
        type: ControlType.Number,
        title: "Decimals",
        defaultValue: 0,
        min: 0,
        max: 2,
        step: 1,
        displayStepper: true,
    },
    duration: {
        type: ControlType.Number,
        title: "Duration",
        defaultValue: 1.4,
        min: 0.2,
        max: 5,
        step: 0.1,
        unit: "s",
    },
    replay: {
        type: ControlType.Boolean,
        title: "Replay",
        defaultValue: false,
        enabledTitle: "Each Scroll",
        disabledTitle: "Once",
    },
    background: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "rgba(0,0,0,0)",
    },
    padding: {
        type: ControlType.Padding,
        title: "Padding",
        defaultValue: "0px",
    },
})
