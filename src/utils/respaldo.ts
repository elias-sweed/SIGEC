import { getSupabase } from '../lib/supabase'
import { logError } from './devlog'

const TABLAS = [
  'eventos',
  'candidatas',
  'jurados',
  'criterios',
  'evaluaciones',
  'evaluacion_detalles',
  'estado_evento',
] as const

/**
 * Descarga un respaldo completo de la base de datos en JSON (para guardar antes
 * de reiniciar el certamen). No borra nada; solo exporta.
 */
export async function descargarRespaldoJSON(): Promise<void> {
  const supabase = getSupabase()
  const datos: Record<string, unknown[]> = {}

  for (const tabla of TABLAS) {
    const { data, error } = await supabase.from(tabla).select('*')
    if (error) {
      logError('respaldo', `tabla ${tabla}: ${error.message}`)
      continue
    }
    datos[tabla] = data ?? []
  }

  const blob = new Blob([JSON.stringify(datos, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const fecha = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  link.download = `respaldo_sigec_${fecha}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
