/* eslint-disable */
// Cobalt Sprite — Originkit
// Exact WebGL Single-Shader Raytracer

import React, { useEffect, useRef, useState } from "react"
import type { CSSProperties } from "react"

export const DEFAULTS = {
    face: "eyes" as "eyes" | "none",
    background: "#000000",
    scale: 90,
    spriteColor: "#FF4D22", // Vibrant rich orangish-red
    frost: 5,
    follow: "page" as "page" | "frame" | "off",
    reach: 10,
    lean: 10,
    blink: 4, // Calmer, natural lifelike blink frequency
    float: 15,
}

export const DEFAULT_ADVANCED = {
    /** Where the sprite looks with no cursor - the reference's own gaze */
    restX: 12,
    restY: 10,
    /** Roll of the face about its own axis; negative is clockwise */
    roll: -10,
    /** Hard limit on how far it turns toward the cursor */
    maxTurn: 38,
    /** Direction the seam plane faces, in the picture plane (0 = right, 90 = up) - 85deg = 5deg from horizontal */
    seamAngle: 85,
    /** How far the seam plane is turned away from facing the camera */
    seamTilt: 70,
    /** Seam plane's distance from the centre, % of the shell radius; negative is toward the frosted half */
    seamOffset: -5,
    /** Shell wall, % of its radius */
    shell: 4.5,
    /** How far the seam's lip reaches in past the wall, % of the radius */
    lip: 6,
    /** Sprite radius, % of the shell's */
    spriteSize: 59.3,
    /** Angle between the pills, seen from the sprite's centre */
    eyeGap: 45,
    eyeLength: 34,
    eyeWidth: 10,
    eyeColor: "#FFFFFF",
    lightAngle: 0,
    gloss: 100,
    glow: 100,
    grain: 100,
    followMs: 90,
    blinkMs: 190, // Soft natural blink length
}

export type Advanced = typeof DEFAULT_ADVANCED

export interface MarbleSpriteProps {
    face?: "eyes" | "none"
    background?: string
    scale?: number
    spriteColor?: string
    frost?: number
    follow?: "page" | "frame" | "off"
    reach?: number
    lean?: number
    blink?: number
    float?: number
    advanced?: Partial<Advanced>
    size?: number
    caption?: string
    className?: string
    style?: CSSProperties
}

const VERT = `
attribute vec2 aPos;
void main() {
    gl_Position = vec4(aPos, 0.0, 1.0);
}
`

const FRAG = `
uniform vec2  uCenter;   // capsule centre, device px
uniform float uRadius;   // capsule radius, device px
uniform vec3  uSeamN;    // seam plane normal, view space, toward the clear half
uniform float uSeamD;
uniform float uRi;       // inner radius of the shell
uniform float uLip;      // inner radius of the seam lip
uniform vec3  uBallC;
uniform float uBallR;
uniform mat3  uRot;      // sprite local -> view
uniform vec4  uEye;      // half gap, half segment length, half width (rad), openness
uniform float uFace;
uniform vec3  uBall;
uniform vec3  uEyeCol;
uniform vec3  uBg;
uniform float uFrost;    // 0 clear, 1 the reference, 2 near opaque milk
uniform float uGloss;
uniform float uGlow;
uniform float uGrain;
uniform vec2  uLight;    // cos, sin of the studio's roll
uniform float uDpr;
uniform float uTime;

const float IOR = 1.5;

float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
}

float stad(vec2 m, vec2 c, float a, float hl, float hw, float blur) {
    vec2 d = m - c;
    float ca = cos(a), sa = sin(a);
    vec2 q = vec2(ca * d.x + sa * d.y, -sa * d.x + ca * d.y);
    q.x = max(abs(q.x) - hl, 0.0);
    float w = hw + blur;
    float k = length(q) / w;
    float v = smoothstep(1.0, 0.6, k) * 0.8 + exp(-k * k * 0.9) * 0.2;
    return v * (hw / w) * ((hl + hw) / (hl + w));
}

vec2 polar(float r, float deg) {
    float a = radians(deg);
    return r * vec2(cos(a), sin(a));
}

vec3 env(vec3 R, float blur, float ring, float mz, float upper) {
    vec3 h = R + vec3(0.0, 0.0, 1.0);
    float lh = length(h);
    vec2 m = lh > 1e-4 ? h.xy / lh : normalize(R.xy + 1e-6);
    m *= mz;
    m = vec2(uLight.x * m.x + uLight.y * m.y, -uLight.y * m.x + uLight.x * m.y);
    float rm = length(m);

    vec3 c = vec3(0.0);
    float mg = 0.3 + blur * 3.0;
    if (m.x > -0.25 - mg && m.y > 0.25 - mg) {
        float s = 0.0;
        s += stad(m, polar(0.884, 92.7), radians(161.0), 0.040, 0.024, blur) * upper;
        s += stad(m, polar(0.839, 73.1), radians(149.0), 0.130, 0.040, blur) * upper;
        s += stad(m, polar(0.892, 61.1), radians(144.0), 0.145, 0.033, blur) * upper;
        s += stad(m, polar(0.884, 33.4), radians(120.0), 0.160, 0.036, blur) * 0.9;
        s += stad(m, polar(0.825, 34.2), radians(116.0), 0.105, 0.040, blur);
        c = vec3(1.0, 0.99, 0.98) * 30.0 * s;
    }

    c += vec3(0.93, 0.95, 1.0) * 3.2 * smoothstep(0.982, 0.999, rm) * ring;
    c += vec3(0.9, 0.93, 1.0) * 0.05 * smoothstep(-0.2, 0.9, m.y) * (1.0 - rm * rm * 0.5);
    return c;
}

float fres(float c) {
    c = clamp(c, 0.0, 1.0);
    return 0.04 + 0.96 * pow(1.0 - c, 5.0);
}

float frostLight(vec3 P, float ext) {
    vec3 n = normalize(P);
    float kl = max(dot(n, normalize(vec3(-0.95, -0.15, 0.30))), 0.0);
    float kb = max(dot(n, normalize(vec3(0.55, -0.60, -0.60))), 0.0);
    vec3 Lo = normalize(vec3(-0.10, 0.15, 0.98));
    vec3 oc = uBallC - P;
    float tc = max(dot(oc, Lo), 0.0);
    float dist = length(oc - Lo * tc);
    float shade = smoothstep(uBallR * 0.95, uBallR * 1.12, dist);
    return 0.02 + ext * 1.1 * kl * kl * kl + (0.85 * kb * kb + 0.05) * shade;
}

vec2 sphereHit(vec3 ro, vec3 rd, vec3 c, float r) {
    vec3 oc = ro - c;
    float b = dot(oc, rd);
    float h = b * b - (dot(oc, oc) - r * r);
    if (h < 0.0) return vec2(-1.0);
    h = sqrt(h);
    return vec2(-b - h, -b + h);
}

vec4 pill(vec2 q, float px) {
    float open = max(uEye.w, 0.12);
    float hl = uEye.y * open;
    float hw = uEye.z * mix(0.7, 1.0, open);
    vec2 a = vec2(q.x, max(abs(q.y) - hl, 0.0) * sign(q.y));
    a.y /= mix(0.45, 1.0, open);
    float dd = length(a);
    float cov = smoothstep(hw + px, hw - px, dd);
    float hgt = sqrt(max(hw * hw - dd * dd, 0.0));
    vec2 dir = dd > 1e-5 ? a / dd : vec2(0.0);
    return vec4(cov, dir * dd, hgt);
}

vec3 shadeBall(vec3 P, vec3 rd, float px) {
    vec3 N = normalize(P - uBallC);
    vec3 nl = N * uRot;
    vec3 albedo = uBall;
    float eye = 0.0;
    vec3 Ns = N;

    if (uFace > 0.5 && nl.z > cos(min(uEye.x + uEye.y + uEye.z + 0.05, 3.0))) {
        float lon = atan(nl.x, nl.z);
        float lat = asin(clamp(nl.y, -1.0, 1.0));
        float cl = cos(lat);
        float pa = px / uBallR * 1.2;
        float side = lon < 0.0 ? -1.0 : 1.0;
        vec2 q = vec2((lon - side * uEye.x) * cl, lat);
        vec4 e = pill(q, pa);
        if (e.x > 0.0) {
            vec3 tu = vec3(cos(lon), 0.0, -sin(lon));
            vec3 tv = vec3(-sin(lat) * sin(lon), cl, -sin(lat) * cos(lon));
            vec3 bent = normalize(nl * max(e.w, 1e-4) + (tu * e.y + tv * e.z) * 0.85);
            Ns = normalize(uRot * bent);
            eye = e.x;
            albedo = mix(albedo, uEyeCol, e.x);
        }
    }

    vec3 n = normalize(mix(N, Ns, eye));
    vec3 Lk = normalize(vec3(0.62, 0.62, 0.48));
    float d = clamp((dot(n, Lk) + 0.6) / 1.6, 0.0, 1.0);
    vec3 c = albedo * (0.80 + 0.30 * d);
    float rimLift = pow(1.0 - clamp(n.z, 0.0, 1.0), 1.6) *
                    smoothstep(-0.5, 0.7, dot(n.xy, vec2(0.55, 0.83)));
    c += vec3(0.30, 0.31, 0.29) * rimLift * (1.0 - eye);
    float wash = pow(max(dot(n, normalize(vec3(0.62, 0.62, 0.35))), 0.0), 1.5);
    c += vec3(0.45, 0.46, 0.42) * wash * (1.0 - eye);
    c += vec3(0.30) * pow(max(dot(n, normalize(vec3(0.58, 0.50, 0.64))), 0.0), 2.2) * eye;
    vec3 R = reflect(rd, n);
    float F = 0.04 + 0.96 * pow(1.0 - max(dot(-rd, n), 0.0), 5.0);
    c += env(R, mix(0.06, 0.04, eye), 0.10, 1.15, 0.15) * mix(F * 1.2, F * 1.8 + 0.03, eye) * uGloss;
    c = mix(c, c * vec3(0.86, 0.87, 1.0), eye * (1.0 - d));
    return c;
}

vec3 backWall(vec3 Pw, vec3 rd, float px) {
    vec3 Nin = -Pw / uRi;
    float side = dot(uSeamN, Pw) - uSeamD;
    float fm = smoothstep(0.012, -0.012, side) * min(uFrost, 1.0);

    float F = fres(dot(-rd, Nin));
    vec3 clear = uBg * 0.85 + env(reflect(rd, Nin), 0.02, 0.4, 1.0, 1.0) * F * 0.55 * uGloss;
    float g = smoothstep(0.25, 0.8, 1.0 - abs(dot(rd, Nin)));
    clear += vec3(0.003, 0.0035, 0.005) + vec3(0.040, 0.042, 0.052) * g * g;

    if (fm <= 0.0) return clear;
    vec3 frosted = vec3(0.84, 0.88, 0.97) * 0.42 * frostLight(Pw, 0.25);
    return mix(clear, frosted, fm);
}

vec4 seamBand(vec2 p, float px) {
    if (abs(uSeamN.z) < 1e-3) return vec4(0.0, 0.0, -9.0, 0.0);
    float zp = (uSeamD - uSeamN.x * p.x - uSeamN.y * p.y) / uSeamN.z;
    vec3 P = vec3(p, zp);
    float rp = length(P);
    if (rp < uLip - 0.02 || rp > 1.0) return vec4(0.0, 0.0, zp, 0.0);
    vec2 g = (P.xy - P.z * uSeamN.xy / uSeamN.z) / max(rp, 1e-4);
    float sw = 1.0 - uLip;
    float s = (rp - uLip) / sw;
    float ds = length(g) * px / sw;
    float body = smoothstep(-ds, ds, s) * smoothstep(1.0 + ds, 1.0 - ds, s);
    float w = max(1.3 * ds, 0.07);
    float lines = 0.0;
    lines += 1.00 * smoothstep(max(1.8 * ds, 0.14), 0.0, abs(s - 0.90));
    lines += 0.70 * smoothstep(w, 0.0, abs(s - 0.50));
    lines += 0.85 * smoothstep(w, 0.0, abs(s - 0.08));
    float dark = 0.0;
    dark += smoothstep(w * 1.3, 0.0, abs(s - 0.70));
    dark += smoothstep(w * 1.1, 0.0, abs(s - 0.29));
    return vec4(body, clamp(lines, 0.0, 1.0), zp, clamp(dark, 0.0, 1.0));
}

float tone(float x) {
    return x < 0.8 ? x : 0.8 + 0.2 * (1.0 - exp(-(x - 0.8) / 0.2));
}

void main() {
    float px = 1.0 / uRadius;
    vec2 p = (gl_FragCoord.xy - uCenter) * px;
    float r = length(p);
    vec3 rd = vec3(0.0, 0.0, -1.0);

    float x = max(r - 1.0, 0.0);
    vec3 halo = vec3(0.92, 0.95, 1.0) * (0.11 * exp(-x / 0.006) + 0.03 * exp(-x / 0.02)) * uGlow;

    vec3 col = uBg;
    float cov = 1.0 - smoothstep(1.0 - px, 1.0 + px, r);
    if (cov > 0.0) {
        float rr = min(r, 0.99999);
        vec3 P0 = vec3(p, sqrt(1.0 - rr * rr));
        vec3 N0 = P0;
        float Fo = fres(N0.z);
        vec3 refl = env(reflect(rd, N0), 0.0, 1.0, 1.0, 1.0) * Fo * uGloss;
        float frontSide = dot(uSeamN, P0) - uSeamD;
        float fm = smoothstep(0.012, -0.012, frontSide) * min(uFrost, 1.0);
        float thick = max(uFrost - 1.0, 0.0);

        vec3 r1 = refract(rd, N0, 1.0 / IOR);
        vec2 hi = sphereHit(P0, r1, vec3(0.0), uRi);
        vec3 Pi = P0 + r1 * hi.x;
        vec3 Ni = Pi / uRi;
        vec3 r2 = refract(r1, Ni, IOR);
        vec3 inner;
        float ballZ = -9.0;
        float tir = 1.0 - step(0.0, hi.x) * step(1e-4, dot(r2, r2));

        if (tir < 0.5) {
            vec2 hb = sphereHit(Pi, r2, uBallC, uBallR);
            if (hb.x > 0.0) {
                vec3 Pb = Pi + r2 * hb.x;
                ballZ = Pb.z;
                inner = shadeBall(Pb, r2, px);
            } else {
                vec2 hw = sphereHit(Pi, r2, vec3(0.0), uRi);
                inner = backWall(Pi + r2 * hw.y, r2, px);
            }
            inner *= vec3(0.96, 0.975, 0.985);

            if (fm > 0.0) {
                vec3 oc = uBallC - Pi;
                float tc = max(dot(oc, r2), 0.0);
                float dist = length(oc - r2 * tc);
                float bc = smoothstep(uBallR + 0.24, uBallR - 0.22, dist);
                vec3 behind = mix(inner * 0.35, uBall * 0.60, bc);
                float milk = pow(smoothstep(0.80 + 0.2 * thick, 0.22, N0.z), 1.8 - 1.0 * thick);
                float sharp = smoothstep(0.75, 0.95, N0.z) * (1.0 - thick);
                behind = mix(behind, inner, sharp * 0.3);
                float scatter = (0.55 + frostLight(P0, 0.85)) * (0.02 + 0.98 * milk);
                vec3 frosted = behind * (1.0 - milk * 0.8) + vec3(0.88, 0.90, 0.97) * scatter;
                inner = mix(inner, frosted, fm);
            }
        } else {
            vec3 rt = reflect(r1, normalize(Pi));
            if (hi.x <= 0.0) rt = r1;
            vec2 ho = sphereHit(P0 + r1 * max(hi.x, 0.0), rt, vec3(0.0), 1.0);
            vec3 P2 = P0 + r1 * max(hi.x, 0.0) + rt * ho.y;
            vec3 r3 = refract(rt, -normalize(P2), IOR);
            if (dot(r3, r3) < 1e-4) r3 = rt;
            float b = (r - uRi) / (1.0 - uRi);
            vec3 clearRim = uBg * 0.6 + env(r3, 0.03, 0.05, 1.0, 1.0) * 0.20 + vec3(0.040, 0.042, 0.052) * (0.8 + 0.6 * b);
            clearRim += vec3(0.9, 0.93, 1.0) * 0.6 * exp(-pow(b / 0.12, 2.0)) * smoothstep(-0.1, 0.8, p.y);
            inner = clearRim;
            if (fm > 0.0) {
                vec3 frostRim = vec3(0.88, 0.90, 0.97) * (0.55 + frostLight(P0, 0.85)) * 1.15;
                inner = mix(clearRim, frostRim, fm);
            }
        }

        col = inner * (1.0 - Fo) + refl;

        vec4 sb = seamBand(p, px);
        if (sb.x > 0.0 && sb.z > ballZ) {
            float hidden = sb.z < 0.0 ? fm * 0.85 : 0.0;
            float a = sb.x * (1.0 - hidden);
            vec3 edge = vec3(0.95, 0.97, 1.0) * 1.6;
            vec3 c2 = col * 0.62 + vec3(0.12, 0.125, 0.15) * (0.6 + 0.6 * min(uFrost, 1.0));
            c2 = mix(c2, c2 * 0.35, sb.w * 0.8);
            c2 = mix(c2, edge, sb.y);
            col = mix(col, c2, a);
        }
    }

    float haloAlpha = (0.11 * exp(-x / 0.006) + 0.03 * exp(-x / 0.02)) * uGlow;
    vec3 haloCol = halo;

    vec3 outCol = mix(haloCol, col, cov);
    outCol = vec3(tone(outCol.r), tone(outCol.g), tone(outCol.b));
    outCol = pow(clamp(outCol, 0.0, 1.0), vec3(1.0 / 2.2));

    // Calculate alpha: opaque 1.0 inside sphere, smoothly anti-aliased edge, completely transparent outside
    float alpha = clamp(cov + haloAlpha * 1.5, 0.0, 1.0);

    if (alpha <= 0.002) {
        gl_FragColor = vec4(0.0);
        return;
    }

    vec2 gp = floor(gl_FragCoord.xy / max(uDpr, 1.0));
    outCol += (hash13(vec3(gp, uTime)) - 0.5) * (4.0 / 255.0) * uGrain * cov;

    // Output premultiplied alpha for clean WebGL blending over DOM
    gl_FragColor = vec4(outCol * alpha, alpha);
}
`

/* ------------------------------------------------------------- helpers */

function toRGB(css: string): [number, number, number] {
    if (!css) return [0, 0, 0]
    const s = css.trim()
    const hex = /^#([0-9a-f]{3,8})$/i.exec(s)
    if (hex) {
        let h = hex[1]
        if (h.length === 3 || h.length === 4) {
            h = h.split("").map((c) => c + c).join("")
        }
        const n = parseInt(h.slice(0, 6), 16)
        return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
    }
    return [0, 0, 0]
}

function lin(css: string): [number, number, number] {
    const c = toRGB(css)
    return [Math.pow(c[0], 2.2), Math.pow(c[1], 2.2), Math.pow(c[2], 2.2)]
}

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

type V3 = [number, number, number]

function rotX(v: V3, a: number): V3 {
    const c = Math.cos(a), s = Math.sin(a)
    return [v[0], c * v[1] - s * v[2], s * v[1] + c * v[2]]
}

function rotY(v: V3, a: number): V3 {
    const c = Math.cos(a), s = Math.sin(a)
    return [c * v[0] + s * v[2], v[1], -s * v[0] + c * v[2]]
}

const DEG = Math.PI / 180
const FIT = 0.709
const DPR_CAP = 3.5
const CAPSULE_PX = 3200

export function CobaltSprite({
    face = DEFAULTS.face,
    background = DEFAULTS.background,
    scale = DEFAULTS.scale,
    spriteColor = DEFAULTS.spriteColor,
    frost = DEFAULTS.frost,
    follow = DEFAULTS.follow,
    reach = DEFAULTS.reach,
    lean = DEFAULTS.lean,
    blink = DEFAULTS.blink,
    float = DEFAULTS.float,
    advanced,
    size = 320,
    caption,
    className = "",
    style,
}: MarbleSpriteProps) {
    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [failed, setFailed] = useState(false)

    const props = {
        face,
        background,
        scale,
        spriteColor,
        frost,
        follow,
        reach,
        lean,
        blink,
        float,
        adv: { ...DEFAULT_ADVANCED, ...advanced },
    }
    const propsRef = useRef(props)
    propsRef.current = props

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return

        let disposed = false
        let raf = 0
        let gl: WebGLRenderingContext | null = null
        let program: WebGLProgram | null = null
        let buffer: WebGLBuffer | null = null
        let uni: Record<string, WebGLUniformLocation | null> = {}
        let onScreen = true
        let pageVisible = true
        let reduceMotion = false

        let cssW = Math.max(1, size || host.clientWidth || 300)
        let cssH = Math.max(1, size || host.clientHeight || 300)
        let dpr = 1
        let quality = 1

        const pointer = { x: 0, y: 0, u: 0.5, v: 0.5, active: false, down: false, moved: false, lastMove: -1e9 }
        let rectDirty = true

        let yaw = DEFAULT_ADVANCED.restX * DEG
        let pitch = DEFAULT_ADVANCED.restY * DEG
        let leanX = 0
        let leanY = 0
        let open = 1
        let squint = 0
        let nextBlink = 1.6
        let blinkT = -1
        let doubleBlink = false
        let clock = 0
        let lastNow = 0

        let lastDraw = -1e9
        let drawnProps: unknown = null
        let forceDraw = true
        let frameMs = 16.7
        let postDrawMs = 16.7
        let slowFor = 0
        let fastFor = 0
        let justDrew = false

        const rot = new Float32Array(9)
        const colorCache = new Map<string, [number, number, number]>()
        const linC = (css: string) => {
            let c = colorCache.get(css)
            if (!c) {
                if (colorCache.size > 32) colorCache.clear()
                c = lin(css)
                colorCache.set(css, c)
            }
            return c
        }

        function init(): boolean {
            // Robust WebGL context acquisition with transparent alpha support
            const ctx = (
                canvas!.getContext("webgl", {
                    alpha: true,
                    premultipliedAlpha: true,
                    antialias: false,
                    depth: false,
                    stencil: false,
                }) ||
                canvas!.getContext("experimental-webgl", {
                    alpha: true,
                    premultipliedAlpha: true,
                })
            ) as WebGLRenderingContext | null

            if (!ctx) {
                console.error("WebGL context initialization failed on canvas element")
                return false
            }
            gl = ctx

            const hp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)
            const prelude = "precision " + (hp && hp.precision > 0 ? "highp" : "mediump") + " float;\n"
            const vs = compile(gl, gl.VERTEX_SHADER, VERT)
            const fs = compile(gl, gl.FRAGMENT_SHADER, prelude + FRAG)
            if (!vs || !fs) return false

            const prog = gl.createProgram()
            if (!prog) return false
            gl.attachShader(prog, vs)
            gl.attachShader(prog, fs)
            gl.bindAttribLocation(prog, 0, "aPos")
            gl.linkProgram(prog)

            if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
                console.error("Program link error:", gl.getProgramInfoLog(prog))
                return false
            }
            program = prog
            gl.useProgram(prog)

            buffer = gl.createBuffer()
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
            gl.enableVertexAttribArray(0)
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

            uni = {}
            for (const n of [
                "uCenter", "uRadius", "uSeamN", "uSeamD", "uRi", "uLip", "uBallC", "uBallR", "uRot",
                "uEye", "uFace", "uBall", "uEyeCol", "uBg", "uFrost", "uGloss", "uGlow", "uGrain",
                "uLight", "uDpr", "uTime",
            ]) {
                uni[n] = gl.getUniformLocation(prog, n)
            }

            forceDraw = true
            return true
        }

        function applySize(): boolean {
            if (!gl) return false
            const p = propsRef.current
            // High Definition Supersampling:
            // Ensure at least 2.0x DPR and up to 3.5x on high-DPI displays for razor-sharp rendering
            const rawDpr = window.devicePixelRatio || 1
            const targetDpr = Math.max(2.0, Math.min(DPR_CAP, rawDpr * 1.25))
            dpr = targetDpr
            const w = Math.max(1, Math.round(cssW * dpr))
            const h = Math.max(1, Math.round(cssH * dpr))
            if (canvas!.width === w && canvas!.height === h) return false
            canvas!.width = w
            canvas!.height = h
            gl.viewport(0, 0, w, h)
            return true
        }

        function step(dt: number, now: number): "active" | "idle" | "still" {
            const p = propsRef.current
            const a = p.adv
            const still = reduceMotion
            clock += dt

            const radius = FIT * (Math.max(1, p.scale) / 100) * Math.min(cssW, cssH) * 0.5
            const fl = still ? 0 : p.float / 10
            const cx = cssW * 0.5 + Math.sin(clock * 0.53) * fl * 0.035 * radius
            const cy = cssH * 0.5 + Math.sin(clock * 0.8) * fl * 0.07 * radius

            if (pointer.active && (pointer.moved || rectDirty)) {
                const r = host!.getBoundingClientRect()
                if (r.width > 0 && r.height > 0) {
                    pointer.u = (pointer.x - r.left) / r.width
                    pointer.v = (pointer.y - r.top) / r.height
                }
                pointer.moved = false
                rectDirty = false
            }

            let tx = a.restX * DEG
            let ty = a.restY * DEG
            let lx = 0
            let ly = 0
            const following = p.follow !== "off" && pointer.active
            if (following) {
                const dx = (pointer.u * cssW - cx) / radius
                const dy = -(pointer.v * cssH - cy) / radius
                if (p.reach > 0) {
                    const D = 16 / p.reach
                    const lim = a.maxTurn * DEG
                    tx = Math.max(-lim, Math.min(lim, Math.atan2(dx, D)))
                    ty = Math.max(-lim, Math.min(lim, Math.atan2(dy, Math.hypot(dx, D))))
                }
                const k = (p.lean / 10) * 22 * DEG
                lx = Math.max(-1, Math.min(1, dx / 2.5)) * k
                ly = Math.max(-1, Math.min(1, dy / 2.5)) * k
            } else if (!still) {
                tx += Math.sin(clock * 0.37) * 6 * DEG * fl + Math.sin(clock * 0.91) * 2 * DEG * fl
                ty += Math.sin(clock * 0.29 + 1.3) * 4 * DEG * fl
            }
            if (!still) {
                lx += Math.sin(clock * 0.53) * 3 * DEG * fl
                ly += Math.sin(clock * 0.41 + 0.7) * 2 * DEG * fl
            }
            const y0 = yaw, p0 = pitch, lx0 = leanX, ly0 = leanY
            const k = 1 - Math.exp(-dt / Math.max(0.005, a.followMs / 1000))
            yaw += (tx - yaw) * k
            pitch += (ty - pitch) * k
            const kl = 1 - Math.exp(-dt / 0.35)
            leanX += (lx - leanX) * kl
            leanY += (ly - leanY) * kl

            const bd = Math.max(0.12, (a.blinkMs || 190) / 1000)
            if (!still && p.blink > 0) {
                nextBlink -= dt
                if (nextBlink <= 0 && blinkT < 0) {
                    blinkT = 0
                    // Natural organic blink pacing: relaxed interval between 4.5s and 9s
                    const gap = Math.max(3.5, (11 - Math.min(p.blink, 10)) * 0.8 + 2.5 + Math.random() * 3.5)
                    if (doubleBlink) doubleBlink = false
                    else doubleBlink = Math.random() < 0.08 // Rare 8% double-blink
                    nextBlink = doubleBlink ? bd + 0.16 : gap
                }
            }
            let o = 1
            if (blinkT >= 0) {
                blinkT += dt
                const u = blinkT / bd
                // Smooth sinusoidal natural blink squash
                if (u < 0.35) {
                    const t = u / 0.35
                    o = 0.5 * (1.0 + Math.cos(Math.PI * t)) // 1.0 -> 0.0 smoothly
                } else if (u <= 1.0) {
                    const t = (u - 0.35) / 0.65
                    o = 0.5 * (1.0 - Math.cos(Math.PI * t)) // 0.0 -> 1.0 smoothly
                } else {
                    blinkT = -1
                    o = 1.0
                }
            }
            const sq = pointer.down ? 1 : 0
            squint += (sq - squint) * (1 - Math.exp(-dt / 0.06))
            open = Math.min(o, 1 - squint * 0.8)

            const turn = Math.abs(yaw - y0) + Math.abs(pitch - p0) + Math.abs(leanX - lx0) + Math.abs(leanY - ly0)
            const speed = (turn / Math.max(dt, 1e-3)) * radius
            if (speed > 12 || blinkT >= 0 || Math.abs(sq - squint) > 1e-3 || now - pointer.lastMove < 300)
                return "active"
            const rest = (Math.abs(tx - yaw) + Math.abs(ty - pitch) + Math.abs(lx - leanX) + Math.abs(ly - leanY)) * radius
            return fl > 0 || rest > 0.25 ? "idle" : "still"
        }

        function draw() {
            if (!gl || !program) return
            const p = propsRef.current
            const a = p.adv
            const still = reduceMotion

            const W = canvas!.width
            const H = canvas!.height
            const radius = FIT * (Math.max(1, p.scale) / 100) * Math.min(W, H) * 0.5
            const fl = still ? 0 : p.float / 10
            const cx = W * 0.5 + Math.sin(clock * 0.53) * fl * 0.035 * radius
            const cy = H * 0.5 + Math.sin(clock * 0.8) * fl * 0.07 * radius

            const cp = Math.cos(pitch)
            const fx = Math.sin(yaw) * cp, fy = Math.sin(pitch), fz = Math.cos(yaw) * cp
            const rl = Math.hypot(fz, fx) || 1
            const rx = fz / rl, rz = -fx / rl
            const ux = fy * rz, uy = fz * rx - fx * rz, uz = -fy * rx
            const cr = Math.cos(a.roll * DEG), sr = Math.sin(a.roll * DEG)
            rot[0] = rx * cr + ux * sr
            rot[1] = uy * sr
            rot[2] = rz * cr + uz * sr
            rot[3] = ux * cr - rx * sr
            rot[4] = uy * cr
            rot[5] = uz * cr - rz * sr
            rot[6] = fx
            rot[7] = fy
            rot[8] = fz

            const sa = a.seamAngle * DEG
            const st = a.seamTilt * DEG
            let n: V3 = [Math.cos(sa) * Math.sin(st), Math.sin(sa) * Math.sin(st), Math.cos(st)]
            n = rotY(n, leanX)
            n = rotX(n, -leanY)

            const ri = 1 - Math.max(0.01, Math.min(0.3, a.shell / 100))
            const lip = Math.max(0.3, ri - Math.max(0, a.lip / 100))
            const br = Math.max(0.1, Math.min(ri - 0.02, a.spriteSize / 100))
            const by = still ? 0 : Math.sin(clock * 0.8 - 0.9) * fl * 0.045

            gl.uniform2f(uni.uCenter, cx, H - cy)
            gl.uniform1f(uni.uRadius, radius)
            gl.uniform3f(uni.uSeamN, n[0], n[1], n[2])
            gl.uniform1f(uni.uSeamD, a.seamOffset / 100)
            gl.uniform1f(uni.uRi, ri)
            gl.uniform1f(uni.uLip, lip)
            gl.uniform3f(uni.uBallC, 0, by, 0)
            gl.uniform1f(uni.uBallR, br)
            gl.uniformMatrix3fv(uni.uRot, false, rot)
            gl.uniform4f(
                uni.uEye,
                (a.eyeGap / 2) * DEG,
                Math.max(0, (a.eyeLength - a.eyeWidth) / 2) * DEG,
                (a.eyeWidth / 2) * DEG,
                open
            )
            gl.uniform1f(uni.uFace, p.face === "eyes" ? 1 : 0)
            const bc = linC(p.spriteColor)
            const ec = linC(a.eyeColor)
            const bg = linC(p.background)
            gl.uniform3f(uni.uBall, bc[0], bc[1], bc[2])
            gl.uniform3f(uni.uEyeCol, ec[0], ec[1], ec[2])
            gl.uniform3f(uni.uBg, bg[0], bg[1], bg[2])
            gl.uniform1f(uni.uFrost, Math.max(0, Math.min(2, p.frost / 5)))
            gl.uniform1f(uni.uGloss, a.gloss / 100)
            gl.uniform1f(uni.uGlow, a.glow / 100)
            gl.uniform1f(uni.uGrain, a.grain / 100)
            gl.uniform2f(uni.uLight, Math.cos(a.lightAngle * DEG), Math.sin(a.lightAngle * DEG))
            gl.uniform1f(uni.uDpr, Math.max(dpr, 1))
            gl.uniform1f(uni.uTime, still ? 0 : clock % 100)

            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)
            gl.enable(gl.BLEND)
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
            gl.drawArrays(gl.TRIANGLES, 0, 3)
        }

        function adapt(ms: number) {
            postDrawMs += (ms - postDrawMs) * 0.1
            // Keep full HD quality fixed at 1.0 without aggressive resolution drops
            quality = 1.0
        }

        function loop(now: number) {
            if (disposed) return
            raf = requestAnimationFrame(loop)
            if (!onScreen || !pageVisible) {
                lastNow = 0
                return
            }
            const ms = lastNow ? now - lastNow : 0
            lastNow = now
            if (ms > 0) {
                frameMs += (Math.min(ms, 100) - frameMs) * 0.1
                if (justDrew) adapt(ms)
            }
            justDrew = false
            const mode = step(Math.min(ms / 1000, 0.1), now)

            const p = propsRef.current
            const resized = applySize()
            const changed = forceDraw || resized || p !== drawnProps
            const interval = changed ? 1000 / 60 : mode === "active" ? 1000 / 60 : mode === "idle" ? 1000 / 30 : Infinity
            if (now - lastDraw < interval - frameMs * 0.5) return
            lastDraw = now
            drawnProps = p
            forceDraw = false
            draw()
            justDrew = true
        }

        if (!init()) {
            setFailed(true)
            return
        }

        // Immediately apply initial dimensions & draw first frame
        applySize()
        draw()

        const record = (e: MouseEvent | PointerEvent) => {
            pointer.x = e.clientX
            pointer.y = e.clientY
            pointer.moved = true
            pointer.active = true
            pointer.lastMove = performance.now()
        }
        const onRootMove = (e: PointerEvent) => {
            if (propsRef.current.follow === "frame") record(e)
        }
        const onRootLeave = () => {
            if (propsRef.current.follow === "frame") {
                pointer.active = false
                pointer.lastMove = performance.now()
            }
            pointer.down = false
        }
        const onWinMove = (e: PointerEvent | MouseEvent) => {
            if (propsRef.current.follow === "page") record(e)
        }
        const onWinOut = (e: PointerEvent) => {
            if (!e.relatedTarget && propsRef.current.follow === "page") {
                pointer.active = false
                pointer.lastMove = performance.now()
            }
        }
        const onDown = (e: PointerEvent) => {
            record(e)
            pointer.down = true
        }
        const onUp = (e: PointerEvent) => {
            pointer.down = false
            pointer.lastMove = performance.now()
            if (e.pointerType === "touch") pointer.active = false
        }
        const onScroll = () => {
            rectDirty = true
        }
        const passive: AddEventListenerOptions = { passive: true }
        host.addEventListener("pointermove", onRootMove, passive)
        host.addEventListener("pointerleave", onRootLeave, passive)
        host.addEventListener("pointerdown", onDown, passive)
        window.addEventListener("pointermove", onWinMove, passive)
        window.addEventListener("mousemove", onWinMove as any, passive)
        window.addEventListener("pointerout", onWinOut, passive)
        window.addEventListener("pointerup", onUp, passive)
        window.addEventListener("pointercancel", onUp, passive)
        window.addEventListener("scroll", onScroll, { passive: true, capture: true })

        const ro =
            typeof ResizeObserver !== "undefined"
                ? new ResizeObserver((entries) => {
                      const r = entries[entries.length - 1].contentRect
                      cssW = Math.max(1, r.width)
                      cssH = Math.max(1, r.height)
                      rectDirty = true
                      forceDraw = true
                  })
                : null
        if (ro) ro.observe(host)

        const io =
            typeof IntersectionObserver !== "undefined"
                ? new IntersectionObserver(
                      (en) => {
                          onScreen = en.some((e) => e.isIntersecting)
                          forceDraw = true
                      },
                      { rootMargin: "256px" }
                  )
                : null
        if (io) io.observe(host)

        const onVisibility = () => {
            pageVisible = document.visibilityState !== "hidden"
            forceDraw = true
        }
        document.addEventListener("visibilitychange", onVisibility)
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
        reduceMotion = mq.matches
        const onMQ = (e: MediaQueryListEvent) => {
            reduceMotion = e.matches
            forceDraw = true
        }
        mq.addEventListener("change", onMQ)

        const onLost = (e: Event) => {
            e.preventDefault()
            cancelAnimationFrame(raf)
        }
        const onRestored = () => {
            if (disposed) return
            lastNow = 0
            if (init()) {
                setFailed(false)
                applySize()
                draw()
                raf = requestAnimationFrame(loop)
            } else {
                setFailed(true)
            }
        }
        canvas.addEventListener("webglcontextlost", onLost)
        canvas.addEventListener("webglcontextrestored", onRestored)

        raf = requestAnimationFrame(loop)

        return () => {
            disposed = true
            cancelAnimationFrame(raf)
            host.removeEventListener("pointermove", onRootMove)
            host.removeEventListener("pointerleave", onRootLeave)
            host.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointermove", onWinMove)
            window.removeEventListener("mousemove", onWinMove as any)
            window.removeEventListener("pointerout", onWinOut)
            window.removeEventListener("pointerup", onUp)
            window.removeEventListener("pointercancel", onUp)
            window.removeEventListener("scroll", onScroll, { capture: true })
            if (ro) ro.disconnect()
            if (io) io.disconnect()
            document.removeEventListener("visibilitychange", onVisibility)
            mq.removeEventListener("change", onMQ)
            canvas.removeEventListener("webglcontextlost", onLost)
            canvas.removeEventListener("webglcontextrestored", onRestored)
            // Clean up WebGL resources WITHOUT force-killing the context with lose.loseContext()
            if (gl) {
                if (buffer) gl.deleteBuffer(buffer)
                if (program) gl.deleteProgram(program)
            }
        }
    }, [])

    const hostStyle: CSSProperties = {
        position: "relative",
        width: size,
        height: size,
        overflow: "visible",
        display: "flex",
        background: "transparent",
        ...style,
    }

    return (
        <div className={`relative inline-flex flex-col items-center select-none ${className}`}>
            <div ref={hostRef} style={hostStyle}>
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

            {caption && (
                <div className="mt-3 flex items-center space-x-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm pointer-events-none transition-all">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(255,100,34,0.6)]" />
                    <span className="text-[11px] font-mono tracking-tight text-zinc-300 font-medium">
                        {caption}
                    </span>
                </div>
            )}
        </div>
    )
}

export default CobaltSprite
export { CobaltSprite as MarbleSprite }
