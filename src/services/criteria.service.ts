import { getSupabase } from '../lib/supabase'
import type { Criterio } from '../types/database'

export async function obtenerCriteriosPorEtapa(etapa: string): Promise<Criterio[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('criterios')
    .select('*')
    .eq('etapa', etapa)
    .order('orden')

  if (error) throw error
  return (data ?? []) as Criterio[]
}
