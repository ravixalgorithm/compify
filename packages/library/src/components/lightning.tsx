import {
    addPropertyControls,
    ControlType,
    RenderTarget,
    useIsStaticRenderer,
} from "framer"
import { useEffect, useRef, type CSSProperties } from "react"

interface LightningProps {
    color: string
    xOffset: number
    speed: number
    intensity: number
    size: number
    angle: number
    animation: boolean
    preview: boolean
    style?: CSSProperties
}

const VERT = `
attribute vec2 aPos;
void main() {
    gl_Position = vec4(aPos, 0.0, 1.0);
}
`

const FRAG = `
precision highp float;

uniform vec2 iResolution;
uniform float iTime;
uniform vec3 uColor;
uniform float uXOffset;
uniform float uSpeed;
uniform float uIntensity;
uniform float uSize;
uniform float uAngle;

float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

mat2 rotate2d(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat2(c, -s, s, c);
}

float noise(vec2 p) {
    vec2 ip = floor(p);
    vec2 fp = fract(p);
    float a = hash12(ip);
    float b = hash12(ip + vec2(1.0, 0.0));
    float c = hash12(ip + vec2(0.0, 1.0));
    float d = hash12(ip + vec2(1.0, 1.0));
    vec2 t = smoothstep(0.0, 1.0, fp);
    return mix(mix(a, b, t.x), mix(c, d, t.x), t.y);
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 10; ++i) {
        value += amplitude * noise(p);
        p = rotate2d(0.45) * p;
        p *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    uv = 2.0 * uv - 1.0;
    uv.x *= iResolution.x / iResolution.y;

    uv = rotate2d(uAngle) * uv;
    uv.x += uXOffset;

    uv += 2.0 * fbm(uv + uSpeed * iTime) - 1.0;

    float dist = abs(uv.x);
    vec3 col = uColor * pow(mix(0.0, 0.07, hash11(iTime)) * uIntensity / dist, 1.0);
    col = pow(col, vec3(1.0 / uSize));

    gl_FragColor = vec4(col, 1.0);
}
`

function parseColor(input: string): [number, number, number] {
    const fallback: [number, number, number] = [0.2, 0.3, 0.8]
    if (!input) return fallback
    const s = input.trim()
    // #rgb / #rrggbb
    if (s[0] === "#") {
        let hex = s.slice(1)
        if (hex.length === 3)
            hex = hex
                .split("")
                .map((c) => c + c)
                .join("")
        if (hex.length >= 6) {
            const r = parseInt(hex.slice(0, 2), 16) / 255
            const g = parseInt(hex.slice(2, 4), 16) / 255
            const b = parseInt(hex.slice(4, 6), 16) / 255
            return [r, g, b]
        }
        return fallback
    }
    // rgb()/rgba()
    let m = s.match(/rgba?\(([^)]+)\)/i)
    if (m) {
        const parts = m[1].split(",").map((v) => parseFloat(v))
        return [parts[0] / 255, parts[1] / 255, parts[2] / 255]
    }
    // hsl()/hsla()
    m = s.match(/hsla?\(([^)]+)\)/i)
    if (m) {
        const parts = m[1].split(",").map((v) => parseFloat(v))
        const h = ((parts[0] % 360) + 360) % 360 / 360
        const sat = parts[1] / 100
        const li = parts[2] / 100
        const k = (n: number) => (n + h * 12) % 12
        const f = (n: number) =>
            li -
            sat *
                Math.min(li, 1 - li) *
                Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
        return [f(0), f(8), f(4)]
    }
    return fallback
}

function compile(
    gl: WebGLRenderingContext,
    type: number,
    src: string
): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn("Lightning shader error:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

/**
 * Lightning
 *
 * Animated WebGL lightning-bolt background (fbm-distorted glow). Drop it behind
 * content as a full-bleed background.
 *
 * @framerIntrinsicWidth 600
 * @framerIntrinsicHeight 400
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
export default function Lightning(props: LightningProps) {
    const {
        color = "#3b5bff",
        xOffset = 0,
        speed = 0.2,
        intensity = 1,
        size = 0.8,
        angle = -40,
        animation = true,
        preview = true,
    } = props

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const isStatic = useIsStaticRenderer()

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas || typeof window === "undefined") return

        const gl =
            (canvas.getContext("webgl", {
                premultipliedAlpha: false,
            }) as WebGLRenderingContext | null) ||
            (canvas.getContext(
                "experimental-webgl"
            ) as WebGLRenderingContext | null)
        if (!gl) return

        const vs = compile(gl, gl.VERTEX_SHADER, VERT)
        const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
        if (!vs || !fs) return
        const program = gl.createProgram()
        if (!program) return
        gl.attachShader(program, vs)
        gl.attachShader(program, fs)
        gl.linkProgram(program)
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.warn("Lightning link error:", gl.getProgramInfoLog(program))
            return
        }
        gl.useProgram(program)

        const buffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 3, -1, -1, 3]),
            gl.STATIC_DRAW
        )
        const aPos = gl.getAttribLocation(program, "aPos")
        gl.enableVertexAttribArray(aPos)
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

        const uRes = gl.getUniformLocation(program, "iResolution")
        const uTime = gl.getUniformLocation(program, "iTime")
        const uColor = gl.getUniformLocation(program, "uColor")
        const uXOffset = gl.getUniformLocation(program, "uXOffset")
        const uSpeed = gl.getUniformLocation(program, "uSpeed")
        const uIntensity = gl.getUniformLocation(program, "uIntensity")
        const uSize = gl.getUniformLocation(program, "uSize")
        const uAngle = gl.getUniformLocation(program, "uAngle")

        const rgb = parseColor(color)
        const angleRad = (angle * Math.PI) / 180

        function resize() {
            if (!canvas || !gl) return
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            const w = Math.max(1, Math.floor(canvas.clientWidth * dpr))
            const h = Math.max(1, Math.floor(canvas.clientHeight * dpr))
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w
                canvas.height = h
            }
            gl.viewport(0, 0, canvas.width, canvas.height)
        }

        function draw(t: number) {
            if (!gl || !canvas) return
            resize()
            gl.uniform2f(uRes, canvas.width, canvas.height)
            gl.uniform1f(uTime, t)
            gl.uniform3f(uColor, rgb[0], rgb[1], rgb[2])
            gl.uniform1f(uXOffset, xOffset)
            gl.uniform1f(uSpeed, speed)
            gl.uniform1f(uIntensity, intensity)
            gl.uniform1f(uSize, Math.max(0.001, size))
            gl.uniform1f(uAngle, angleRad)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }

        // In the Framer editor (static), draw one frame if preview is on.
        if (isStatic) {
            if (preview) {
                draw(1.6)
                const ro = new ResizeObserver(() => draw(1.6))
                ro.observe(canvas)
                return () => ro.disconnect()
            } else {
                gl.clearColor(0, 0, 0, 1)
                gl.clear(gl.COLOR_BUFFER_BIT)
                return
            }
        }

        // Live: animate, or render a single static frame.
        if (!animation) {
            draw(1.6)
            const ro = new ResizeObserver(() => draw(1.6))
            ro.observe(canvas)
            return () => ro.disconnect()
        }

        let raf = 0
        const start = performance.now()
        const loop = () => {
            const t = (performance.now() - start) / 1000
            draw(t)
            raf = window.requestAnimationFrame(loop)
        }
        raf = window.requestAnimationFrame(loop)
        return () => window.cancelAnimationFrame(raf)
    }, [
        color,
        xOffset,
        speed,
        intensity,
        size,
        angle,
        animation,
        preview,
        isStatic,
    ])

    const hideInPreview =
        !preview && RenderTarget.current() === RenderTarget.preview

    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background: "#000",
                ...props.style,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    visibility: hideInPreview ? "hidden" : "visible",
                }}
            />
        </div>
    )
}

addPropertyControls(Lightning, {
    color: {
        type: ControlType.Color,
        title: "Color",
        defaultValue: "#3b5bff",
    },
    xOffset: {
        type: ControlType.Number,
        title: "X Offset",
        defaultValue: 0,
        min: -1,
        max: 1,
        step: 0.01,
    },
    speed: {
        type: ControlType.Number,
        title: "Speed",
        defaultValue: 0.2,
        min: 0,
        max: 2,
        step: 0.05,
    },
    intensity: {
        type: ControlType.Number,
        title: "Intensity",
        defaultValue: 1,
        min: 0,
        max: 3,
        step: 0.05,
    },
    size: {
        type: ControlType.Number,
        title: "Size",
        defaultValue: 0.8,
        min: 0.1,
        max: 3,
        step: 0.05,
    },
    angle: {
        type: ControlType.Number,
        title: "Angle",
        defaultValue: -40,
        min: -90,
        max: 90,
        step: 1,
        unit: "°",
    },
    animation: {
        type: ControlType.Boolean,
        title: "Animation",
        defaultValue: true,
        enabledTitle: "Yes",
        disabledTitle: "No",
    },
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: true,
        enabledTitle: "Yes",
        disabledTitle: "No",
    },
})
