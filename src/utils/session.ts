const KEY_ID = 'sigec_jurado_id'
const KEY_CODIGO = 'sigec_jurado_codigo'
const KEY_EXPIRA = 'sigec_jurado_expira'
const KEY_ACTIVADO = 'sigec_jurado_activado'

/** Duración de la sesión del jurado en el dispositivo (6 horas). */
const TTL_SESION_MS = 6 * 60 * 60 * 1000

export interface SesionJurado {
  id: string
  codigo: string
}

/**
 * Guarda la sesión del jurado en localStorage (persiste al cerrar el tab /
 * el navegador) con una expiración de 6 horas. Evita que el jurado pierda su
 * acceso si cierra la pestaña o el celular mata el proceso.
 */
export function guardarSesionJurado(id: string, codigo: string): void {
  localStorage.setItem(KEY_ID, id)
  localStorage.setItem(KEY_CODIGO, codigo)
  localStorage.setItem(KEY_EXPIRA, String(Date.now() + TTL_SESION_MS))
}

export function leerSesionJurado(): SesionJurado | null {
  if (typeof localStorage === 'undefined') return null

  // Si expiró, limpiar y devolver sesión vacía
  const expira = Number(localStorage.getItem(KEY_EXPIRA) ?? 0)
  if (expira && Date.now() > expira) {
    limpiarSesionJurado()
    return null
  }

  const id = localStorage.getItem(KEY_ID)
  const codigo = localStorage.getItem(KEY_CODIGO)
  return id && codigo ? { id, codigo } : null
}

export function limpiarSesionJurado(): void {
  localStorage.removeItem(KEY_ID)
  localStorage.removeItem(KEY_CODIGO)
  localStorage.removeItem(KEY_EXPIRA)
}

/** Marca local de activación: útil si la columna `activado` aún no existe. */
export function marcarActivadoLocal(codigo: string): void {
  localStorage.setItem(KEY_ACTIVADO, codigo)
}

export function estaActivadoLocal(codigo: string): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(KEY_ACTIVADO) === codigo
}
