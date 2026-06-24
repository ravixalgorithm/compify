// @ts-ignore
import { useEffect, useRef, type CSSProperties } from "react"
import { addPropertyControls, ControlType, useIsStaticRenderer } from "framer"

interface LightRaysProps {
    color?: string
    background?: string
    animation?: number
    intensity?: number
    rays?: number
    reach?: number
    position?: number
    radius?: number
    style?: CSSProperties
}

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main(){ vUv = aPos*0.5+0.5; gl_Position = vec4(aPos,0.0,1.0); }
`

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
uniform float uPos;
uniform vec3 uColor;
uniform vec4 uBg;
uniform float uIntensity;
uniform float uRays;
uniform float uReach;
uniform float uAnim;

float hash(vec2 p){ p = fract(p*vec2(123.34,345.45)); p += dot(p,p+34.345); return fract(p.x*p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i+vec2(1.0,0.0)), c = hash(i+vec2(0.0,1.0)), d = hash(i+vec2(1.0,1.0));
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for(int i=0;i<4;i++){ v += a*noise(p); p *= 2.0; a *= 0.5; }
  return v;
}

void main(){
  vec2 uv = vUv;
  float aspect = uRes.x / uRes.y;
  vec2 src = vec2(uPos, 1.16);            // light source above the top edge
  vec2 d = uv - src;
  d.x *= aspect;
  float dist = length(d);
  float ang = atan(d.x, -d.y);            // 0 = straight down

  float t = uTime * uAnim * 0.08;

  // broad, soft angular rays
  float density = max(2.0, uRays) * 0.28;
  float s = fbm(vec2(ang * density + t, ang * density * 0.5 - t * 0.6));
  float streak = smoothstep(0.30, 0.88, s);

  // vertical blue gradient: bright at top, black at bottom (Reach extends rays down)
  float hazePow = mix(3.4, 1.1, clamp(uReach, 0.0, 1.0));
  float haze = pow(clamp(uv.y, 0.0, 1.0), hazePow);
  // tight bright bloom where the light originates
  float bloom = exp(-dist * 2.4);
  // downward cone so the rays fan but fade at the extreme sides
  float cone = smoothstep(1.4, 0.12, abs(ang));

  float rays = streak * cone * haze;
  float light = (rays * 0.9 + bloom * 0.7 + haze * 0.22) * uIntensity;
  light = clamp(light, 0.0, 1.7);

  vec3 col = uBg.rgb + uColor * light;
  float a = clamp(uBg.a + light, 0.0, 1.0);
  gl_FragColor = vec4(col, a);
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string) {
    const sh = gl.createShader(type)!
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    return sh
}

function parseColor(str: string): [number, number, number, number] {
    if (typeof document === "undefined" || !str) return [0, 0, 0, 1]
    const c = document.createElement("canvas")
    c.width = c.height = 1
    const x = c.getContext("2d")
    if (!x) return [0, 0, 0, 1]
    x.clearRect(0, 0, 1, 1)
    x.fillStyle = "#000"
    x.fillStyle = str
    x.fillRect(0, 0, 1, 1)
    const d = x.getImageData(0, 0, 1, 1).data
    return [d[0] / 255, d[1] / 255, d[2] / 255, d[3] / 255]
}

/**
 * Light Rays
 *
 * Animated volumetric "god rays" beaming from a light source at the top, over a
 * customizable backdrop. Control colour, background, animation speed, intensity,
 * ray density, reach, source position and corner radius.
 *
 * @framerIntrinsicWidth 800
 * @framerIntrinsicHeight 460
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
export default function LightRays(props: LightRaysProps) {
    const {
        color = "#7fb0ff",
        background = "#04060c",
        animation = 8,
        intensity = 55,
        rays = 22,
        reach = 60,
        position = 50,
        radius = 0,
        style,
    } = props

    const isStatic = useIsStaticRenderer()
    const wrapRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const cfg = useRef({ color, background, animation, intensity, rays, reach, position })
    cfg.current = { color, background, animation, intensity, rays, reach, position }

    useEffect(() => {
        if (typeof window === "undefined") return
        const canvas = canvasRef.current
        const wrap = wrapRef.current
        if (!canvas || !wrap) return
        const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false, antialias: true }) as WebGLRenderingContext | null
        if (!gl) return
        const c: HTMLCanvasElement = canvas
        const box: HTMLDivElement = wrap
        const g: WebGLRenderingContext = gl

        const prog = gl.createProgram()!
        gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT))
        gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG))
        gl.linkProgram(prog)
        gl.useProgram(prog)

        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
        const aPos = gl.getAttribLocation(prog, "aPos")
        gl.enableVertexAttribArray(aPos)
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

        const uRes = gl.getUniformLocation(prog, "uRes")
        const uTime = gl.getUniformLocation(prog, "uTime")
        const uPos = gl.getUniformLocation(prog, "uPos")
        const uColor = gl.getUniformLocation(prog, "uColor")
        const uBg = gl.getUniformLocation(prog, "uBg")
        const uIntensity = gl.getUniformLocation(prog, "uIntensity")
        const uRays = gl.getUniformLocation(prog, "uRays")
        const uReach = gl.getUniformLocation(prog, "uReach")
        const uAnim = gl.getUniformLocation(prog, "uAnim")

        const dpr = Math.min(1.75, window.devicePixelRatio || 1)
        function resize() {
            const w = box.clientWidth, h = box.clientHeight
            c.width = Math.max(1, Math.floor(w * dpr))
            c.height = Math.max(1, Math.floor(h * dpr))
            g.viewport(0, 0, c.width, c.height)
        }

        function render(time: number) {
            const k = cfg.current
            const col = parseColor(k.color)
            const bg = parseColor(k.background)
            g.useProgram(prog)
            g.uniform2f(uRes, c.width, c.height)
            g.uniform1f(uTime, time * 0.001)
            g.uniform1f(uPos, k.position / 100)
            g.uniform3f(uColor, col[0], col[1], col[2])
            g.uniform4f(uBg, bg[0], bg[1], bg[2], bg[3])
            g.uniform1f(uIntensity, k.intensity / 45)
            g.uniform1f(uRays, Math.max(1, k.rays))
            g.uniform1f(uReach, k.reach / 100)
            g.uniform1f(uAnim, k.animation / 10)
            g.drawArrays(g.TRIANGLES, 0, 3)
        }

        resize()
        render(0)

        let raf = 0
        const animate = !isStatic && animation > 0
        if (animate) {
            const loop = (t: number) => {
                render(t)
                raf = requestAnimationFrame(loop)
            }
            raf = requestAnimationFrame(loop)
        }

        const ro = typeof ResizeObserver !== "undefined"
            ? new ResizeObserver(() => { resize(); render(performance.now()) })
            : null
        ro?.observe(box)

        return () => {
            if (raf) cancelAnimationFrame(raf)
            ro?.disconnect()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isStatic, animation])

    return (
        <div
            ref={wrapRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                minWidth: 80,
                minHeight: 80,
                overflow: "hidden",
                borderRadius: radius,
                ...style,
            }}
        >
            <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
        </div>
    )
}

addPropertyControls(LightRays, {
    color: { type: ControlType.Color, title: "Color", defaultValue: "#7fb0ff" },
    background: { type: ControlType.Color, title: "Background", defaultValue: "#04060c" },
    animation: { type: ControlType.Number, title: "Animation", defaultValue: 8, min: 0, max: 40, step: 1 },
    intensity: { type: ControlType.Number, title: "Intensity", defaultValue: 55, min: 0, max: 100, step: 1 },
    rays: { type: ControlType.Number, title: "Rays", defaultValue: 22, min: 2, max: 100, step: 1 },
    reach: { type: ControlType.Number, title: "Reach", defaultValue: 60, min: 0, max: 100, step: 1 },
    position: { type: ControlType.Number, title: "Position", defaultValue: 50, min: 0, max: 100, step: 1, unit: "%" },
    radius: { type: ControlType.Number, title: "Radius", defaultValue: 0, min: 0, max: 80, step: 1, unit: "px" },
})
