import { getSupabase } from '../lib/supabase'
import { logError } from '../utils/devlog'
import type { Jurado } from '../types/database'

const DOMINIO_EMAIL = 'sigec.local'

/** Correo interno derivado del código: JUR-001 → jur-001@sigec.local */
export function emailDeJurado(codigo: string): string {
  return `${codigo.trim().toLowerCase()}@${DOMINIO_EMAIL}`
}

/** URL de activación que codifica el QR (absoluta para escanear desde el móvil). */
export function urlActivacion(codigo: string): string {
  return `${window.location.origin}/jurado/activar?codigo=${encodeURIComponent(codigo)}`
}

/** Imagen QR que apunta a la URL de activación del jurado. */
export function urlQR(codigo: string, size = 200): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    urlActivacion(codigo),
  )}`
}

export async function obtenerJuradoPorCodigo(codigo: string): Promise<Jurado | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('jurados')
    .select('*')
    .eq('codigo', codigo.trim().toUpperCase())
    .maybeSingle()
  if (error) logError('obtenerJuradoPorCodigo', error.message)
  return (data as Jurado | null) ?? null
}

/** Verifica que una columna exista en una tabla del esquema public (evita 400s). */
export async function columnaExiste(tabla: string, columna: string): Promise<boolean> {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', tabla)
      .eq('column_name', columna)
      .maybeSingle()
    return !error && !!data
  } catch (err) {
    logError('columnaExiste', err instanceof Error ? err.message : String(err))
    return false
  }
}

/**
 * Marca "En sesión" / "Sin sesión" del jurado.
 * Antes de actualizar verifica que la columna `en_sesion` exista; si la migración
 * aún no se aplicó, omite la actualización sin provocar un error 400.
 */
export async function marcarEnSesion(juradoId: string, activa: boolean): Promise<void> {
  if (!(await columnaExiste('jurados', 'en_sesion'))) return
  try {
    const supabase = getSupabase()
    const { error } = await supabase
      .from('jurados')
      .update({ en_sesion: activa })
      .eq('id', juradoId)
    if (error) logError('marcarEnSesion', error.message)
  } catch (err) {
    logError('marcarEnSesion', err instanceof Error ? err.message : String(err))
  }
}

/** Registra que el jurado completó su primer acceso. */
export async function marcarActivado(juradoId: string, emailInterno: string, authUid?: string): Promise<void> {
  const supabase = getSupabase()
  const payload: Record<string, string | boolean | null> = {
    activado: true,
    email_interno: emailInterno,
  }
  if (authUid) payload.auth_uid = authUid
  const { error } = await supabase.from('jurados').update(payload).eq('id', juradoId)
  if (error) logError('marcarActivado', error.message)
}