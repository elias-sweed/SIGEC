import { getSupabase } from '../lib/supabase'
import { logConsulta, logError } from '../utils/devlog'

const TABLAS_EN_ORDEN = [
  'evaluacion_detalles',
  'evaluaciones',
  'estado_evento',
  'criterios',
  'jurados',
  'candidatas',
  'eventos',
] as const

const ID_NEUTRO = '00000000-0000-0000-0000-000000000000'

export async function resetCertamen(): Promise<void> {
  const supabase = getSupabase()

  for (const tabla of TABLAS_EN_ORDEN) {
    logConsulta(`resetCertamen: vaciar tabla "${tabla}"`)
    const { error } = await supabase.from(tabla).delete().neq('id', ID_NEUTRO)
    if (error) {
      logError('resetCertamen', `tabla ${tabla}: ${error.message}`)
      throw new Error(`No se pudo vaciar "${tabla}": ${error.message}`)
    }
  }
}