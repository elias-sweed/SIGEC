import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getSupabase } from '../lib/supabase'
import { logFilas, logError } from '../utils/devlog'
import { useCertamen } from './CertamenContext'
import type { Candidata, Criterio, Evaluacion, EvaluacionDetalle, Evento, Jurado, ReglamentoEtapa } from '../types/database'

interface PanelData {
  evento: Evento | null
  candidatas: Candidata[]
  jurados: Jurado[]
  criterios: Criterio[]
  evaluaciones: Evaluacion[]
  detalles: EvaluacionDetalle[]
  reglamentos: ReglamentoEtapa[]
  recargar: () => Promise<void>
}

const PanelDataContext = createContext<PanelData | null>(null)

export function PanelDataProvider({ children }: { children: ReactNode }) {
  const { cargarEstado } = useCertamen()

  const [evento, setEvento] = useState<Evento | null>(null)
  const [candidatas, setCandidatas] = useState<Candidata[]>([])
  const [jurados, setJurados] = useState<Jurado[]>([])
  const [criterios, setCriterios] = useState<Criterio[]>([])
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([])
  const [detalles, setDetalles] = useState<EvaluacionDetalle[]>([])
  const [reglamentos, setReglamentos] = useState<ReglamentoEtapa[]>([])

  const cargarDatos = useCallback(async () => {
    const supabase = getSupabase()

    const [ev, ca, ju, cr, evals, dets, regls] = await Promise.all([
      supabase.from('eventos').select('*').order('created_at').limit(1).maybeSingle(),
      supabase.from('candidatas').select('*').order('nombre'),
      supabase.from('jurados').select('*').order('codigo'),
      supabase.from('criterios').select('*').order('orden'),
      supabase.from('evaluaciones').select('*'),
      supabase.from('evaluacion_detalles').select('evaluacion_id, puntaje'),
      supabase.from('reglamento_etapa').select('*'),
    ])

    if (ev.error) logError('eventos', ev.error.message)
    if (cr.error) logError('criterios', cr.error.message)

    setEvento((ev.data as Evento | null) ?? null)
    setCandidatas((ca.data ?? []) as Candidata[])
    setJurados((ju.data ?? []) as Jurado[])
    setCriterios((cr.data ?? []) as Criterio[])
    setEvaluaciones((evals.data ?? []) as Evaluacion[])
    setDetalles((dets.data ?? []) as EvaluacionDetalle[])
    setReglamentos((regls.data ?? []) as ReglamentoEtapa[])

    logFilas('panel: candidatas', ca.data ?? [])
    logFilas('panel: jurados', ju.data ?? [])
    logFilas('panel: criterios', cr.data ?? [])
    logFilas('panel: evaluaciones', evals.data ?? [])
  }, [])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  const recargar = useCallback(async () => {
    await cargarDatos()
    await cargarEstado()
  }, [cargarDatos, cargarEstado])

  const valor = useMemo<PanelData>(
    () => ({ evento, candidatas, jurados, criterios, evaluaciones, detalles, reglamentos, recargar }),
    [evento, candidatas, jurados, criterios, evaluaciones, detalles, reglamentos, recargar],
  )

  return <PanelDataContext.Provider value={valor}>{children}</PanelDataContext.Provider>
}

export function usePanelData(): PanelData {
  const contexto = useContext(PanelDataContext)
  if (!contexto) throw new Error('usePanelData debe usarse dentro de PanelDataProvider.')
  return contexto
}