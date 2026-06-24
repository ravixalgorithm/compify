import { addPropertyControls, ControlType, useIsStaticRenderer } from "framer"
import {
    useCallback,
    useEffect,
    useRef,
    useState,
    startTransition,
    type CSSProperties,
} from "react"

interface ImageValue {
    src: string
    srcSet?: string
    alt?: string
}

interface BeforeAfterSliderProps {
    beforeImage: ImageValue
    afterImage: ImageValue
    initialPosition: number
    dividerColor: string
    dividerWidth: number
    handleSize: number
    handleColor: string
    handleIconColor: string
    radius: number
    style?: CSSProperties
}

/**
 * Before / After Image Slider
 *
 * Drag the handle to reveal the two images. Click anywhere to jump the
 * divider, or focus and use the arrow keys.
 *
 * @framerIntrinsicWidth 760
 * @framerIntrinsicHeight 440
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
export default function BeforeAfterSlider(props: BeforeAfterSliderProps) {
    const {
        beforeImage = {
            src: "https://framerusercontent.com/images/GfGkADagM4KEibNcIiRUWlfrR0.jpg",
            alt: "Before",
        },
        afterImage = {
            src: "https://framerusercontent.com/images/aNsAT3jCvt4zglbWCUoFe33Q.jpg",
            alt: "After",
        },
        initialPosition = 50,
        dividerColor = "#ffffff",
        dividerWidth = 2,
        handleSize = 56,
        handleColor = "#ffffff",
        handleIconColor = "#111111",
        radius = 0,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const [position, setPosition] = useState(initialPosition)
    const [isDragging, setIsDragging] = useState(false)
    const isStatic = useIsStaticRenderer()

    useEffect(() => {
        startTransition(() => setPosition(initialPosition))
    }, [initialPosition])

    const updateFromEvent = useCallback((clientX: number) => {
        const el = containerRef.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        const next = Math.max(
            0,
            Math.min(100, ((clientX - rect.left) / rect.width) * 100)
        )
        startTransition(() => setPosition(next))
    }, [])

    const handleDown = useCallback(
        (e: React.PointerEvent) => {
            e.preventDefault()
            startTransition(() => setIsDragging(true))
            updateFromEvent(e.clientX)
        },
        [updateFromEvent]
    )

    useEffect(() => {
        if (isStatic || !isDragging) return
        const move = (e: PointerEvent) => updateFromEvent(e.clientX)
        const up = () => startTransition(() => setIsDragging(false))
        window.addEventListener("pointermove", move)
        window.addEventListener("pointerup", up)
        return () => {
            window.removeEventListener("pointermove", move)
            window.removeEventListener("pointerup", up)
        }
    }, [isDragging, updateFromEvent, isStatic])

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowLeft")
            startTransition(() => setPosition((p) => Math.max(0, p - 2)))
        if (e.key === "ArrowRight")
            startTransition(() => setPosition((p) => Math.min(100, p + 2)))
    }

    const imgBase: CSSProperties = {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        userSelect: "none",
        pointerEvents: "none",
        WebkitUserDrag: "none",
    } as CSSProperties

    return (
        <div
            ref={containerRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                borderRadius: radius,
                cursor: isDragging ? "ew-resize" : "pointer",
                userSelect: "none",
                touchAction: "none",
                background: "#000",
            }}
            onPointerDown={isStatic ? undefined : handleDown}
            onKeyDown={onKeyDown}
            tabIndex={0}
            role="slider"
            aria-valuenow={Math.round(position)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Before after image comparison"
        >
            {/* After image (full, underneath) */}
            <img
                src={afterImage?.src}
                srcSet={afterImage?.srcSet}
                alt={afterImage?.alt ?? ""}
                style={imgBase}
                draggable={false}
            />

            {/* Before image (clipped to the left of the divider) */}
            <img
                src={beforeImage?.src}
                srcSet={beforeImage?.srcSet}
                alt={beforeImage?.alt ?? ""}
                style={{
                    ...imgBase,
                    clipPath: `inset(0 ${100 - position}% 0 0)`,
                }}
                draggable={false}
            />

            {/* Divider line */}
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: `${position}%`,
                    width: dividerWidth,
                    transform: `translateX(-${dividerWidth / 2}px)`,
                    background: dividerColor,
                    boxShadow: "0 0 8px rgba(0,0,0,0.4)",
                    pointerEvents: "none",
                }}
            />

            {/* Circular handle */}
            <div
                style={{
                    position: "absolute",
                    top: "50%",
                    left: `${position}%`,
                    width: handleSize,
                    height: handleSize,
                    transform: "translate(-50%, -50%)",
                    borderRadius: "50%",
                    background: handleColor,
                    boxShadow: "0 2px 12px rgba(0,0,0,0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "ew-resize",
                    touchAction: "none",
                }}
                onPointerDown={isStatic ? undefined : handleDown}
            >
                <svg
                    width={handleSize * 0.42}
                    height={handleSize * 0.42}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={handleIconColor}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <path d="M8 7l-5 5 5 5" />
                    <path d="M16 7l5 5-5 5" />
                    <path d="M3 12h18" />
                </svg>
            </div>
        </div>
    )
}

addPropertyControls(BeforeAfterSlider, {
    beforeImage: {
        type: ControlType.ResponsiveImage,
        title: "Before",
    },
    afterImage: {
        type: ControlType.ResponsiveImage,
        title: "After",
    },
    initialPosition: {
        type: ControlType.Number,
        title: "Position",
        defaultValue: 50,
        min: 0,
        max: 100,
        step: 1,
        unit: "%",
    },
    dividerColor: {
        type: ControlType.Color,
        title: "Divider",
        defaultValue: "#ffffff",
    },
    dividerWidth: {
        type: ControlType.Number,
        title: "Divider W",
        defaultValue: 2,
        min: 0,
        max: 12,
        step: 1,
        unit: "px",
    },
    handleSize: {
        type: ControlType.Number,
        title: "Handle Size",
        defaultValue: 56,
        min: 24,
        max: 120,
        step: 1,
        unit: "px",
    },
    handleColor: {
        type: ControlType.Color,
        title: "Handle",
        defaultValue: "#ffffff",
    },
    handleIconColor: {
        type: ControlType.Color,
        title: "Icon",
        defaultValue: "#111111",
    },
    radius: {
        type: ControlType.Number,
        title: "Radius",
        defaultValue: 0,
        min: 0,
        max: 60,
        step: 1,
        unit: "px",
    },
})
