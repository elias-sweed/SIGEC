import { useEffect, useRef } from 'react'

type Vec3 = [number, number, number]

interface AuroraProps {
  colorStops?: string[]
  amplitude?: number
  blend?: number
  time?: number
  speed?: number
  lightMode?: boolean
}

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const FRAG = `#version 300 es
precision highp float;

uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;
uniform float uLightMode;

out vec4 fragColor;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v){
  const vec4 C = vec4(
      0.211324865405187, 0.366025403784439,
      -0.577350269189626, 0.024390243902439
  );
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);

  vec3 p = permute(
      permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0)
  );

  vec3 m = max(
      0.5 - vec3(
          dot(x0, x0),
          dot(x12.xy, x12.xy),
          dot(x12.zw, x12.zw)
      ),
      0.0
  );
  m = m * m;
  m = m * m;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);

  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

struct ColorStop {
  vec3 color;
  float position;
};

#define COLOR_RAMP(colors, factor, finalColor) {              \
  int index = 0;                                            \
  for (int i = 0; i < 2; i++) {                               \
     ColorStop currentColor = colors[i];                    \
     bool isInBetween = currentColor.position <= factor;    \
     index = int(mix(float(index), float(i), float(isInBetween))); \
  }                                                         \
  ColorStop currentColor = colors[index];                   \
  ColorStop nextColor = colors[index + 1];                  \
  float range = nextColor.position - currentColor.position; \
  float lerpFactor = (factor - currentColor.position) / range; \
  finalColor = mix(currentColor.color, nextColor.color, lerpFactor); \
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;

  ColorStop colors[3];
  colors[0] = ColorStop(uColorStops[0], 0.0);
  colors[1] = ColorStop(uColorStops[1], 0.5);
  colors[2] = ColorStop(uColorStops[2], 1.0);

  vec3 rampColor;
  COLOR_RAMP(colors, uv.x, rampColor);

  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
  height = exp(height);
  height = (uv.y * 2.0 - height + 0.2);
  float intensity = 0.6 * height;

  float midPoint = 0.20;
  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);

  vec3 auroraColor = intensity * rampColor;

  if (uLightMode > 0.5) {
    float energy = clamp(max(intensity, 0.0), 0.0, 1.0);
    float coverage = clamp(auroraAlpha * (0.55 + 0.45 * energy), 0.0, 0.86);
    vec3 chroma = pow(clamp(rampColor, 0.0, 1.0), vec3(1.2));
    float chromaPeak = max(chroma.r, max(chroma.g, chroma.b));
    chroma /= max(chromaPeak, 0.0001);
    fragColor = vec4(mix(vec3(1.0), chroma, min(coverage * 1.08, 0.94)), 1.0);
  } else {
    fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
  }
}
`

function compileShader(gl: WebGL2RenderingContext, source: string, type: number): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Aurora shader compile error:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

function hexToNormalizedRGB(hex: string): Vec3 {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  return [r / 255, g / 255, b / 255]
}

export default function Aurora({
  colorStops = ['#3b5b9e', '#c9a227', '#5f7fae'],
  amplitude = 1.0,
  blend = 0.5,
  time = 0,
  speed = 1.0,
  lightMode = true,
}: AuroraProps) {
  const ctnRef = useRef<HTMLDivElement>(null)
  const propsRef = useRef<AuroraProps>({ colorStops, amplitude, blend, time, speed, lightMode })
  propsRef.current = { colorStops, amplitude, blend, time, speed, lightMode }

  useEffect(() => {
    const ctn = ctnRef.current
    if (!ctn) return

    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'display:block;width:100%;height:100%'
    ctn.appendChild(canvas)

    const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: true })
    if (!gl) {
      console.warn('WebGL2 no soportado para Aurora')
      canvas.remove()
      return
    }
    gl.clearColor(0, 0, 0, 0)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

    const vs = compileShader(gl, VERT, gl.VERTEX_SHADER)
    const fs = compileShader(gl, FRAG, gl.FRAGMENT_SHADER)
    if (!vs || !fs) return

    const program = gl.createProgram()
    if (!program) return
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Aurora program linking error:', gl.getProgramInfoLog(program))
      return
    }
    gl.useProgram(program)

    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1])
    const vertexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

    const aPosition = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(aPosition)
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0)

    const uTimeLoc = gl.getUniformLocation(program, 'uTime')
    const uAmplitudeLoc = gl.getUniformLocation(program, 'uAmplitude')
    const uColorStopsLoc = gl.getUniformLocation(program, 'uColorStops')
    const uResolutionLoc = gl.getUniformLocation(program, 'uResolution')
    const uBlendLoc = gl.getUniformLocation(program, 'uBlend')
    const uLightModeLoc = gl.getUniformLocation(program, 'uLightMode')

    function resize() {
      const el = ctnRef.current
      if (!el) return
      const width = el.offsetWidth
      const height = el.offsetHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.floor(width * dpr))
      canvas.height = Math.max(1, Math.floor(height * dpr))
      gl!.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    let animId = 0
    const start = performance.now()
    const render = () => {
      animId = requestAnimationFrame(render)
      const p = propsRef.current
      const elapsed = (performance.now() - start) / 1000
      const uTime = (p.time !== undefined ? p.time : elapsed) * (p.speed ?? speed) * 0.1

      const stops = p.colorStops ?? colorStops
      const stopsFlat = stops.map((c) => hexToNormalizedRGB(c)).flat()

      gl.uniform1f(uTimeLoc, uTime)
      gl.uniform1f(uAmplitudeLoc, p.amplitude ?? amplitude)
      gl.uniform3fv(uColorStopsLoc, Float32Array.from(stopsFlat))
      gl.uniform2f(uResolutionLoc, canvas.width, canvas.height)
      gl.uniform1f(uBlendLoc, p.blend ?? blend)
      gl.uniform1f(uLightModeLoc, (p.lightMode ?? lightMode) ? 1 : 0)

      gl.drawArrays(gl.TRIANGLES, 0, 6)
    }
    animId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
      const el = ctnRef.current
      if (el && canvas.parentNode === el) el.removeChild(canvas)
      const ext = gl.getExtension('WEBGL_lose_context')
      ext?.loseContext()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={ctnRef} className="h-full w-full" />
}
