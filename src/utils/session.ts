const KEY_ID = 'sigec_jurado_id'
const KEY_CODIGO = 'sigec_jurado_codigo'

export interface SesionJurado {
  id: string
  codigo: string
}

export function guardarSesionJurado(id: string, codigo: string): void {
  sessionStorage.setItem(KEY_ID, id)
  sessionStorage.setItem(KEY_CODIGO, codigo)
}

export function leerSesionJurado(): SesionJurado | null {
  if (typeof sessionStorage === 'undefined') return null
  const id = sessionStorage.getItem(KEY_ID)
  const codigo = sessionStorage.getItem(KEY_CODIGO)
  return id && codigo ? { id, codigo } : null
}

export function limpiarSesionJurado(): void {
  sessionStorage.removeItem(KEY_ID)
  sessionStorage.removeItem(KEY_CODIGO)
}