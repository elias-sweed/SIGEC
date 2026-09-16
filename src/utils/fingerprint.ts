/**
 * Huella de dispositivo para la votación pública.
 * Combina Canvas + WebGL + pantalla + zona horaria en un hash SHA-256 estable,
 * de modo que un dispositivo quede identificado aunque cambie de VPN, correo,
 * modo incógnito o red.
 */

const KEY_TOKEN_DISPOSITIVO = 'sigec-voto-token'

/** Firma de Canvas: dibuja un patrón fijo y captura cómo lo rasteriza el GPU/driver. */
function huellaCanvas(): string {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 240
    canvas.height = 60
    const ctx = canvas.getContext('2d')
    if (!ctx) return 'canvas:no'
    ctx.textBaseline = 'top'
    ctx.font = '14px Arial'
    ctx.fillStyle = '#f60'
    ctx.fillRect(125, 1, 62, 20)
    ctx.fillStyle = '#069'
    ctx.fillText('SIGEC-Certamen-2026', 2, 15)
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)'
    ctx.fillText('votacion-publica', 4, 45)
    ctx.strokeStyle = 'rgba(200, 0, 0, 0.5)'
    ctx.beginPath()
    ctx.arc(180, 35, 12, 0, Math.PI * 2)
    ctx.stroke()
    return canvas.toDataURL()
  } catch {
    return 'canvas:error'
  }
}

/** Firma de WebGL: vendor + renderer desenmascarados (identifica la GPU real). */
function huellaWebGL(): string {
  try {
    const canvas = document.createElement('canvas')
    const gl =
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ??
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null)
    if (!gl) return 'webgl:no'
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = ext
      ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL as GLenum) ?? gl.getParameter(gl.RENDERER))
      : String(gl.getParameter(gl.RENDERER))
    const vendor = ext
      ? String(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL as GLenum) ?? gl.getParameter(gl.VENDOR))
      : String(gl.getParameter(gl.VENDOR))
    return `${vendor}|${renderer}`
  } catch {
    return 'webgl:error'
  }
}

/** Pantalla + zona horaria + idioma + plataforma. */
function datosEntorno(): string {
  try {
    const zona = Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'unknown'
    const offset = new Date().getTimezoneOffset()
    const pantalla = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}x${window.devicePixelRatio ?? 1}`
    const idiomas = (navigator.languages ?? [navigator.language]).join(',')
    return `${pantalla}|${zona}|${offset}|${idiomas}|${navigator.platform ?? ''}`
  } catch {
    return 'entorno:error'
  }
}

/** SHA-256 en hexadecimal; si no hay WebCrypto usa un hash de respaldo estable. */
async function sha256Hex(texto: string): Promise<string> {
  try {
    const data = new TextEncoder().encode(texto)
    const digest = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  } catch {
    let hash = 2166136261
    for (let i = 0; i < texto.length; i++) {
      hash ^= texto.charCodeAt(i)
      hash = Math.imul(hash, 16777619)
    }
    return `fb-${(hash >>> 0).toString(16).padStart(8, '0')}`
  }
}

/**
 * Hash único y estable por dispositivo. Este mismo hash debe bloquear el
 * segundo voto aunque el usuario cambie de correo, use VPN o modo incógnito.
 */
export async function generarHuellaDispositivo(): Promise<string> {
  const entrada = [await huellaCanvas(), huellaWebGL(), datosEntorno()].join('||')
  return sha256Hex(entrada)
}

/**
 * Token de dispositivo persistente (localStorage). Se usa como segunda llave
 * para detectar el mismo móvil en visitas posteriores.
 */
export function generarTokenDispositivo(): string {
  try {
    let token = window.localStorage.getItem(KEY_TOKEN_DISPOSITIVO)
    if (!token) {
      token =
        typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`
      window.localStorage.setItem(KEY_TOKEN_DISPOSITIVO, token)
    }
    return token
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}

/** IP pública (mejor esfuerzo). Si la red de la persona falla, devuelve un marcador. */
export async function obtenerIPPublica(): Promise<string> {
  try {
    const control = new AbortController()
    const timer = window.setTimeout(() => control.abort(), 4000)
    const res = await fetch('https://api.ipify.org?format=json', { signal: control.signal })
    window.clearTimeout(timer)
    if (!res.ok) return 'ip:desconocida'
    const data = (await res.json()) as { ip?: string }
    return data.ip ?? 'ip:desconocida'
  } catch {
    return 'ip:desconocida'
  }
}