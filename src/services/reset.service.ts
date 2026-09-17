import { getSupabase } from '../lib/supabase'
import { logConsulta, logError } from '../utils/devlog'

const FILTRO_TODO = '00000000-0000-0000-0000-000000000000'

/**
 * Reinicia TODO el certamen dejando solo los eventos (las etapas creadas).
 * No importa qué etapa esté seleccionada: es un borrado GLOBAL de todos los
 * datos — jurados, candidatas, criterios, evaluaciones, reglamentos, estado
 * de cada evento, votación pública y auditoría. Los eventos conservan su
 * nombre y etapa; su estado vuelve a "preparando" para arrancar de cero.
 */
export async function resetCertamen(): Promise<void> {
  const supabase = getSupabase()

  // Orden que respeta las claves foráneas:
  //  · evaluacion_detalles.criterio_id -> criterios SIN cascade (primero)
  //  · estado_evento.candidata_actual_id -> candidatas SIN cascade (antes)
  //  · votos_publico / pagos_yape antes de votantes y candidatas
  const tablas: Array<{ tabla: string; detalle: string }> = [
    { tabla: 'evaluacion_detalles', detalle: 'detalles de evaluación' },
    { tabla: 'votos_publico', detalle: 'votos del público' },
    { tabla: 'pagos_yape', detalle: 'pagos Yape' },
    { tabla: 'estado_evento', detalle: 'estado de los eventos' },
    { tabla: 'evaluaciones', detalle: 'evaluaciones' },
    { tabla: 'config_votacion', detalle: 'configuración de votación' },
    { tabla: 'candidatas', detalle: 'candidatas' },
    { tabla: 'jurados', detalle: 'jurados' },
    { tabla: 'criterios', detalle: 'criterios de evaluación' },
    { tabla: 'votantes', detalle: 'votantes' },
    { tabla: 'reglamento_etapa', detalle: 'reglamentos' },
    { tabla: 'auditoria', detalle: 'auditoría' },
  ]

  for (const { tabla, detalle } of tablas) {
    logConsulta(`resetCertamen: limpiando ${tabla} (${detalle})`)
    const { error } = await supabase.from(tabla).delete().neq('id', FILTRO_TODO)
    if (error) {
      logError('resetCertamen', `${tabla}: ${error.message}`)
      throw new Error(`No se pudieron limpiar ${detalle}: ${error.message}`)
    }
  }

  // Los eventos quedan, pero vuelven a "preparando" para reiniciar la operación.
  logConsulta('resetCertamen: eventos -> estado preparando')
  const { error: errEvento } = await supabase
    .from('eventos')
    .update({ estado: 'preparando' })
    .neq('id', FILTRO_TODO)
  if (errEvento) {
    logError('resetCertamen', `eventos: ${errEvento.message}`)
    throw new Error(`No se pudieron reiniciar los eventos: ${errEvento.message}`)
  }
}