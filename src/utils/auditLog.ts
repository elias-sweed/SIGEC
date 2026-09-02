import { getSupabase } from '../lib/supabase'
import { logError } from './devlog'

/**
 * Registra una acción en la tabla de auditoría.
 * usuario: nombre o código del operador/jurado.
 * accion: tipo de evento (login, iniciar_evaluacion, cambiar_candidata, etc.)
 * descripcion: detalle legible de la acción.
 */
export async function registrarAccion(
  usuario: string,
  accion: string,
  descripcion?: string,
): Promise<void> {
  try {
    const supabase = getSupabase()
    const { error } = await supabase.from('auditoria').insert({
      usuario,
      accion,
      descripcion: descripcion ?? null,
    })
    if (error) logError('auditoria', error.message)
  } catch (err) {
    logError('auditoria', err instanceof Error ? err.message : String(err))
  }
}
