import { getSupabase } from '../lib/supabase'
import type { Evaluacion, EvaluacionConDetalles } from '../types/database'

export interface CrearEvaluacionInput {
  evento_id: string
  candidata_id: string
  jurado_id: string
}

export interface GuardarDetalleInput {
  evaluacion_id: string
  criterio_id: string
  puntaje: number
}

export async function crearEvaluacion(input: CrearEvaluacionInput): Promise<Evaluacion> {
  const supabase = getSupabase()

  const { data: existente } = await supabase
    .from('evaluaciones')
    .select('*')
    .match({ ...input })
    .maybeSingle()

  if (existente) return existente as Evaluacion

  const { data, error } = await supabase.from('evaluaciones').insert(input).select('*').single()

  if (error) throw error
  return data as Evaluacion
}

export async function guardarDetalle(input: GuardarDetalleInput): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('evaluacion_detalles')
    .upsert(input, { onConflict: 'evaluacion_id,criterio_id' })

  if (error) throw error
}

export async function obtenerEvaluacionCompleta(evaluacionId: string): Promise<EvaluacionConDetalles> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('evaluaciones')
    .select('*, evaluacion_detalles(*)')
    .eq('id', evaluacionId)
    .single()

  if (error) throw error
  return data as EvaluacionConDetalles
}
