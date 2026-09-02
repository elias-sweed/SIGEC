import { getSupabase } from './supabase'
import { registrarAccion } from '../utils/auditLog'

const SUPERADMIN_EMAIL = (import.meta.env.VITE_SUPERADMIN_EMAIL ?? '').toLowerCase()

/** Email autorizado para entrar al dashboard (único e inmutable). */
export function emailSuperadmin(): string {
  return SUPERADMIN_EMAIL
}

/** Indica si hay una sesión de Supabase Auth activa. */
export async function haySesionAuth(): Promise<boolean> {
  const supabase = getSupabase()
  const { data } = await supabase.auth.getSession()
  return !!data.session
}

/** Devuelve el email de la sesión activa, si existe. */
export async function emailDeSesion(): Promise<string | null> {
  const supabase = getSupabase()
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.email ?? null
}

/** Verdadero si hay sesión activa Y el email es el superadmin autorizado. */
export async function esSuperadminAutenticado(): Promise<boolean> {
  const email = await emailDeSesion()
  return email !== null && email.toLowerCase() === SUPERADMIN_EMAIL
}

/**
 * Inicia sesión del superadmin. Solo acepta el email autorizado
 * (VITE_SUPERADMIN_EMAIL); la contraseña se valida contra Supabase Auth.
 */
export async function iniciarSesionSuperadmin(
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string; session?: unknown }> {
  const emailLimpio = email.trim().toLowerCase()

  if (!SUPERADMIN_EMAIL) {
    return { ok: false, error: 'El email del superadmin no está configurado (VITE_SUPERADMIN_EMAIL).' }
  }

  if (emailLimpio !== SUPERADMIN_EMAIL) {
    return { ok: false, error: 'Este email no tiene permisos de administrador.' }
  }

  const supabase = getSupabase()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailLimpio,
    password,
  })

  if (error) {
    return { ok: false, error: 'Credenciales incorrectas. Verifica tu contraseña.' }
  }

  void registrarAccion(emailLimpio, 'inicio_sesion', 'Inicio de sesión del administrador')

  return { ok: true, session: data.session }
}

/** Cierra la sesión del superadmin. */
export async function cerrarSesionSuperadmin(): Promise<void> {
  const supabase = getSupabase()
  await supabase.auth.signOut()
}

/**
 * Verifica la contraseña del superadmin sin cambiar la sesión activa.
 * Se usa como confirmación para acciones destructivas (p. ej. reiniciar el certamen).
 * Devuelve true solo si las credenciales del superadmin son correctas.
 */
export async function verificarContrasenaSuperadmin(password: string): Promise<boolean> {
  if (!SUPERADMIN_EMAIL) return false
  const supabase = getSupabase()
  const { error } = await supabase.auth.signInWithPassword({
    email: SUPERADMIN_EMAIL,
    password,
  })
  return !error
}
