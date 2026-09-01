// Dot Lens — Originkit
// Originkit — defaults rewritten to match preview.

import { useEffect, useRef } from "react"
import type { CSSProperties } from "react"

/* ---------------------------------------------------------------- types --- */

interface Props {
    background?: string
    baseColor?: string
    accentColor?: string
    density?: number
    dotSize?: number
    reach?: number
    minSize?: number
    speed?: number
    hover?: number
    style?: CSSProperties
}

/* ------------------------------------------------------------- constants --- */

/** Quality tier, not a design control — picked, not exposed. */
const MAX_DPR = 2

/**
 * Hover fade, per second. The POSITION is deliberately NOT eased: the brief is
 * that the biggest dots sit exactly on the pointer, and any follow rate at all
 * puts them behind it during a sweep. Only the hover amount is smoothed, so the
 * field still eases back to its idle path when the pointer leaves.
 */
const HOVER_RATE = 6

/** Idle drift, in units of frame height, at Speed 50. */
const DRIFT_X = 0.3
const DRIFT_Y = 0.24
const DRIFT_RATE_X = 0.31
const DRIFT_RATE_Y = 0.47

type Vec3 = [number, number, number]

/* ------------------------------------------------------------- utilities --- */

/** Parses `#fff`, `#rrggbb`, `#rrggbbaa`, `rgb()` and `rgba()` into 0..1 RGB. */
function parseColor(input: string | undefined, fallback: Vec3): Vec3 {
    if (!input) return fallback
    const str = String(input).trim()

    if (str.charAt(0) === "#") {
        let hex = str.slice(1)
        if (hex.length === 3 || hex.length === 4) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
        }
        if (hex.length >= 6) {
            const r = parseInt(hex.slice(0, 2), 16)
            const g = parseInt(hex.slice(2, 4), 16)
            const b = parseInt(hex.slice(4, 6), 16)
            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r / 255, g / 255, b / 255]
        }
        return fallback
    }

    const parts = str.match(/[\d.]+/g)
    if (parts && parts.length >= 3) {
        return [
            Math.min(255, parseFloat(parts[0])) / 255,
            Math.min(255, parseFloat(parts[1])) / 255,
            Math.min(255, parseFloat(parts[2])) / 255,
        ]
    }
    return fallback
}

function clamp(v: number, lo: number, hi: number): number {
    return v < lo ? lo : v > hi ? hi : v
}

/** A prop that arrives undefined must not turn the whole render NaN. */
function num(v: unknown, fallback: number): number {
    return typeof v === "number" && isFinite(v) ? v : fallback
}

/* --------------------------------------------------------------- shaders --- */

const VERT_SRC = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

const FRAG_SRC = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  uRes;
uniform float uTime;

uniform vec3  uBg;
uniform vec3  uBase;
uniform vec3  uAccent;
uniform vec2  uFocus;       // world units, frame height = 1
uniform float uSpacing;     // world units per cell
uniform float uPeak;        // dot radius at the focus, world units
uniform float uMin;         // smallest radius, as a fraction of uPeak
uniform float uReach;       // world units at which dots are half size

float h21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
    vec2 uv = gl_FragCoord.xy / uRes;
    float aspect = uRes.x / uRes.y;

    // World space: the frame is 1 tall and aspect wide, so one world unit is
    // uRes.y device pixels no matter the shape of the host.
    vec2 p = vec2(uv.x * aspect, uv.y);
    float px = 1.0 / uRes.y;
    float aa = 1.4 * px;

    vec2 id = floor(p / uSpacing);

    float best = 1e9;     // signed distance to the nearest dot
    float bestG = 0.0;    // that dot's size fraction, for the tint

    for (int dj = -1; dj <= 1; dj++) {
        for (int di = -1; di <= 1; di++) {
            vec2 c = (id + vec2(float(di), float(dj)) + 0.5) * uSpacing;

            // Sampled at the CELL CENTRE. Per-pixel would make every dot an
            // oval, fatter on the side facing the focus.
            float t = distance(c, uFocus) / max(uReach, 1e-4);
            float g = 1.0 / (1.0 + t * t);
            float rad = uPeak * mix(uMin, 1.0, g);

            float d = distance(p, c) - rad;
            if (d < best) { best = d; bestG = g; }
        }
    }

    float cov = 1.0 - smoothstep(-aa, aa, best);
    vec3 dotCol = mix(uBase, uAccent, smoothstep(0.25, 0.95, bestG));

    vec3 col = mix(uBg, dotCol, cov);
    col += (h21(gl_FragCoord.xy) - 0.5) * (1.5 / 255.0);

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

function compileShader(
    gl: WebGLRenderingContext,
    type: number,
    src: string
): WebGLShader | null {
    const shader = gl.createShader(type)
    if (!shader) return null
    gl.shaderSource(shader, src)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("DotLens shader:", gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
    }
    return shader
}

/* ------------------------------------------------------------- component --- */

export default function DotLens(props: Props) {
    const { background = "#000000", style } = props

    const rootRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Re-pointed on every render, so the loop reads the current props without
    // the effect depending on them and tearing the context down.
    const propsRef = useRef(props)
    propsRef.current = props

    const pointerRef = useRef({ rawX: 0.5, rawY: 0.5, on: 0, onTarget: 0 })

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        if (!root || !canvas) return

        const gl = canvas.getContext("webgl", {
            antialias: false,
            alpha: false,
            depth: false,
            preserveDrawingBuffer: false,
        })
        if (!gl) {
            console.error("DotLens: WebGL unavailable")
            return
        }

        const vs = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC)
        const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC)
        if (!vs || !fs) return

        const program = gl.createProgram()
        if (!program) return
        gl.attachShader(program, vs)
        gl.attachShader(program, fs)
        gl.linkProgram(program)
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("DotLens link:", gl.getProgramInfoLog(program))
            return
        }
        gl.useProgram(program)

        const buffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
        const posLoc = gl.getAttribLocation(program, "aPos")
        gl.enableVertexAttribArray(posLoc)
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

        const loc = (name: string) => gl.getUniformLocation(program, name)
        const uRes = loc("uRes")
        const uTime = loc("uTime")
        const uBg = loc("uBg")
        const uBase = loc("uBase")
        const uAccent = loc("uAccent")
        const uFocus = loc("uFocus")
        const uSpacing = loc("uSpacing")
        const uPeak = loc("uPeak")
        const uMin = loc("uMin")
        const uReach = loc("uReach")

        // A drawing buffer with alpha:false comes up opaque BLACK, and it stays
        // that way until the first draw lands. That is one frame of a black
        // slab over a light page — and permanently black anywhere the frame
        // loop is throttled off. Clearing to the background colour up front
        // makes the undrawn state indistinguishable from the drawn one.
        const initial = parseColor(propsRef.current.background, [0, 0, 0])
        gl.clearColor(initial[0], initial[1], initial[2], 1)
        gl.clear(gl.COLOR_BUFFER_BIT)

        // offsetWidth/offsetHeight rather than getBoundingClientRect: the rect
        // carries the canvas zoom, so the buffer would drift on a zoomed canvas.
        // Framer's width/height props are not numeric in preview either.
        let cssWidth = root.offsetWidth || 1
        let cssHeight = root.offsetHeight || 1
        const resizeObserver = new ResizeObserver(() => {
            cssWidth = root.offsetWidth || 1
            cssHeight = root.offsetHeight || 1
        })
        resizeObserver.observe(root)

        const reduceMotion =
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches

        let raf = 0
        let last = performance.now()
        let clock = 0

        const render = (now: number) => {
            raf = requestAnimationFrame(render)

            const dt = Math.min(0.05, (now - last) / 1000)
            last = now

            const p = propsRef.current
            const rate = reduceMotion ? 0 : clamp(num(p.speed, 50), 0, 100) / 50
            // Wrapped on the CPU: an unbounded accumulator eventually costs
            // float32 precision inside the shader's fract() calls.
            clock = (clock + dt * rate) % 3600

            const pointer = pointerRef.current
            const ease = (r: number) => 1 - Math.exp(-r * dt)
            pointer.on += (pointer.onTarget - pointer.on) * ease(HOVER_RATE)

            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
            const bufferWidth = Math.max(1, Math.round(cssWidth * dpr))
            const bufferHeight = Math.max(1, Math.round(cssHeight * dpr))
            if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
                canvas.width = bufferWidth
                canvas.height = bufferHeight
                gl.viewport(0, 0, bufferWidth, bufferHeight)
            }
            const aspect = bufferWidth / bufferHeight

            // Idle path, in the same world units the shader uses. It runs on the
            // component's own clock, so Speed 0 parks it dead centre.
            const idleX = aspect * 0.5 + DRIFT_X * Math.sin(clock * DRIFT_RATE_X)
            const idleY = 0.5 + DRIFT_Y * Math.sin(clock * DRIFT_RATE_Y + 1.3)

            // Pointer y arrives top-down; gl_FragCoord is bottom-up.
            const pointerX = pointer.rawX * aspect
            const pointerY = 1 - pointer.rawY
            const follow = (clamp(num(p.hover, 100), 0, 100) / 100) * Math.min(1, pointer.on)

            const density = Math.round(clamp(num(p.density, 30), 8, 80))
            const spacing = 1 / density

            gl.uniform2f(uRes, bufferWidth, bufferHeight)
            gl.uniform1f(uTime, clock)

            const bg = parseColor(p.background, [0, 0, 0])
            const base = parseColor(p.baseColor, [0.541, 0.541, 0.541])
            const accent = parseColor(p.accentColor, [1, 1, 1])
            gl.uniform3f(uBg, bg[0], bg[1], bg[2])
            gl.uniform3f(uBase, base[0], base[1], base[2])
            gl.uniform3f(uAccent, accent[0], accent[1], accent[2])

            gl.uniform2f(
                uFocus,
                idleX + (pointerX - idleX) * follow,
                idleY + (pointerY - idleY) * follow
            )
            gl.uniform1f(uSpacing, spacing)
            // Dot Size is a percent of the CELL, so the peak dot is a constant
            // share of its cell at every Density and 100% is dots touching.
            gl.uniform1f(uPeak, (clamp(num(p.dotSize, 88), 10, 100) / 100) * spacing * 0.5)
            gl.uniform1f(uMin, clamp(num(p.minSize, 8), 0, 50) / 100)
            gl.uniform1f(uReach, clamp(num(p.reach, 20), 5, 100) / 100)

            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }

        // The loop is parked while the field is off-screen. `last` is re-based on
        // resume so the first frame back doesn't integrate the whole scroll away
        // into one jump of the idle path.
        const start = () => {
            if (raf) return
            last = performance.now()
            raf = requestAnimationFrame(render)
        }
        const stop = () => {
            if (!raf) return
            cancelAnimationFrame(raf)
            raf = 0
        }

        const visibility = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) start()
                    else stop()
                }
            },
            { threshold: 0 }
        )
        visibility.observe(root)

        // Listened for on the WINDOW, not the host. As a page background the
        // host sits at z-index -1, and an element behind its own ancestors
        // never gets a pointer event at all: <main> and <body> cover the same
        // ground and win the hit test, transparent or not. So the window
        // reports every move and the rect decides whether it counts, which is
        // the same arithmetic the host listener did — just sourced from
        // somewhere the events actually arrive.
        const onMove = (event: PointerEvent) => {
            // The rect is only used to turn a viewport coordinate into a
            // fraction of the host, which is scale-invariant.
            const rect = root.getBoundingClientRect()
            if (rect.width <= 0 || rect.height <= 0) return

            const pointer = pointerRef.current
            const inside =
                event.clientX >= rect.left &&
                event.clientX <= rect.right &&
                event.clientY >= rect.top &&
                event.clientY <= rect.bottom
            if (!inside) {
                pointer.onTarget = 0
                return
            }

            pointer.rawX = clamp((event.clientX - rect.left) / rect.width, 0, 1)
            pointer.rawY = clamp((event.clientY - rect.top) / rect.height, 0, 1)
            pointer.onTarget = 1
        }
        const onLeave = () => {
            pointerRef.current.onTarget = 0
        }

        window.addEventListener("pointermove", onMove)
        // Leaving through the top of the window fires neither a move nor the
        // host's own leave, so the document boundary and focus loss both count.
        document.addEventListener("pointerleave", onLeave)
        window.addEventListener("blur", onLeave)

        return () => {
            stop()
            visibility.disconnect()
            resizeObserver.disconnect()
            window.removeEventListener("pointermove", onMove)
            document.removeEventListener("pointerleave", onLeave)
            window.removeEventListener("blur", onLeave)
            gl.deleteBuffer(buffer)
            gl.deleteProgram(program)
            gl.deleteShader(vs)
            gl.deleteShader(fs)
            // No loseContext(): getContext hands back the same context per
            // canvas, so a StrictMode remount would reuse a force-lost one and
            // render black forever after.
        }
    }, [])

    return (
        <div
            ref={rootRef}
            style={{
                // Floor before the spread, so an explicit size on the instance
                // still wins. A percentage root collapses to 0x0 under Fit
                // Content, and the canvas is absolutely positioned, so there is
                // no in-flow content to hold the box open.
                minWidth: 1200,
                minHeight: 800,
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                isolation: "isolate",
                background,
                touchAction: "none",
                ...style,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                }}
            />
        </div>
    )
}
