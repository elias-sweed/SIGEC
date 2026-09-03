import { getSupabase } from '../lib/supabase'
import { logError } from '../utils/devlog'
import type { Jurado } from '../types/database'

// Nota sobre el dominio: Supabase Auth rechaza emails cuyo dominio no tenga registro
// MX en DNS (p. ej. sigec.com, example.com → 400 "Email is invalid").
// Se usa un dominio con MX válido (gmail.com) para que la validación pase; estas
// cuentas solo sirven de identificador de login y nunca reciben correos reales
// (la confirmación de email está desactivada), por lo que no importa que la bandeja no exista.
const DOMINIO_EMAIL = 'gmail.com'

/** Correo interno derivado del código: JUR-001 → jur-001@gmail.com */
export function emailDeJurado(codigo: string): string {
  return `${codigo.trim().toLowerCase()}@${DOMINIO_EMAIL}`
}

/** URL de activación que codifica el QR (absoluta para escanear desde el móvil). */
export function urlActivacion(token: string): string {
  return `${window.location.origin}/jurado/activar?t=${encodeURIComponent(token)}`
}

/** Imagen QR que apunta a la URL de activación del jurado. */
export function urlQR(token: string, size = 200): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    urlActivacion(token),
  )}`
}

/** URL del login del jurado (para el QR de ingreso al evento). */
export function urlIngresoJurado(): string {
  return `${window.location.origin}/jurado`
}

/** Imagen QR que apunta al login del jurado (QR genérico de ingreso). */
export function urlQRIngreso(size = 300): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    urlIngresoJurado(),
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

/**
 * Busca un jurado por su token de acceso (QR). Si el token no devuelve nada,
 * intenta con el código directo para mantener compatibilidad con QRs antiguos.
 */
export async function obtenerJuradoPorToken(token: string): Promise<Jurado | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('jurados')
    .select('*')
    .eq('token_acceso', token.trim())
    .maybeSingle()
  if (!error && data) return data as Jurado

  return obtenerJuradoPorCodigo(token)
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

/**
 * Guarda qué candidata está evaluando actualmente el jurado, para que la pantalla
 * pública la muestre en tiempo real. Pasa `null` cuando el jurado deja de evaluar
 * (vuelve al selector o cierra sesión). Omite la actualización si la columna aún
 * no existe (migración pendiente) para no provocar un error 400.
 */
export async function actualizarCandidataJurado(
  juradoId: string,
  candidataId: string | null,
): Promise<void> {
  if (!(await columnaExiste('jurados', 'candidata_actual_id'))) return
  try {
    const supabase = getSupabase()
    const { error } = await supabase
      .from('jurados')
      .update({ candidata_actual_id: candidataId })
      .eq('id', juradoId)
    if (error) logError('actualizarCandidataJurado', error.message)
  } catch (err) {
    logError('actualizarCandidataJurado', err instanceof Error ? err.message : String(err))
  }
}