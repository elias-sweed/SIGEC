import { getSupabase } from '../lib/supabase'
import { logConsulta, logError } from '../utils/devlog'

/**
 * Reinicia SOLO el evento indicado: borra sus evaluaciones, sus detalles y
 * vuelve a "preparando" su estado. Los demás eventos y los datos compartidos
 * (candidatas, jurados, criterios) NUNCA se tocan: cada evento guarda sus
 * propias evaluaciones por evento_id, de modo que al volver a él se recuperan.
 */
export async function resetEvento(eventoId: string): Promise<void> {
  const supabase = getSupabase()

  logConsulta(`resetEvento: limpiar evaluaciones del evento ${eventoId}`)

  // 1) Detalles de las evaluaciones de ESTE evento (primero, por FK)
  const { data: evals } = await supabase
    .from('evaluaciones')
    .select('id')
    .eq('evento_id', eventoId)
  const ids = (evals ?? []).map((e) => e.id as string)
  if (ids.length > 0) {
    const { error } = await supabase
      .from('evaluacion_detalles')
      .delete()
      .in('evaluacion_id', ids)
    if (error) {
      logError('resetEvento', `detalles: ${error.message}`)
      throw new Error(`No se pudieron limpiar los detalles: ${error.message}`)
    }
  }

  // 2) Evaluaciones de ESTE evento
  const { error: errEval } = await supabase.from('evaluaciones').delete().eq('evento_id', eventoId)
  if (errEval) {
    logError('resetEvento', `evaluaciones: ${errEval.message}`)
    throw new Error(`No se pudieron limpiar las evaluaciones: ${errEval.message}`)
  }

  // 3) Estado de ESTE evento: se recrea en "preparando" para que la pantalla
  //    se QUEDE en este evento (si se borrara, el sistema caería al primero).
  const { error: errEstado } = await supabase.from('estado_evento').upsert(
    {
      evento_id: eventoId,
      estado: 'preparando',
      candidata_actual_id: null,
      modo_ensayo: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'evento_id' },
  )
  if (errEstado) {
    logError('resetEvento', `estado_evento: ${errEstado.message}`)
    throw new Error(`No se pudo limpiar el estado: ${errEstado.message}`)
  }

  // 4) El evento vuelve a "preparando"
  const { error: errEvento } = await supabase
    .from('eventos')
    .update({ estado: 'preparando' })
    .eq('id', eventoId)
  if (errEvento) {
    logError('resetEvento', `evento: ${errEvento.message}`)
    throw new Error(`No se pudo reiniciar el evento: ${errEvento.message}`)
  }
}