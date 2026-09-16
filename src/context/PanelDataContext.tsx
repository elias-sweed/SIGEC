import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { getSupabase } from '../lib/supabase'
import { logFilas, logError } from '../utils/devlog'
import { useRealtime } from '../utils/realtime'
import { useCertamen, type EstadoEvento } from './CertamenContext'
import type { Candidata, Criterio, Evaluacion, EvaluacionDetalle, Evento, Jurado, ReglamentoEtapa } from '../types/database'

const KEY_EVENTO_ACTIVO = 'sigec-evento-activo'

interface PanelData {
  eventos: Evento[]
  evento: Evento | null
  estadoEvento: EstadoEvento | null
  candidatas: Candidata[]
  jurados: Jurado[]
  criterios: Criterio[]
  evaluaciones: Evaluacion[]
  detalles: EvaluacionDetalle[]
  reglamentos: ReglamentoEtapa[]
  cargando: boolean
  cargandoInicial: boolean
  recargar: () => Promise<void>
  seleccionarEvento: (id: string) => Promise<void>
}

const PanelDataContext = createContext<PanelData | null>(null)

export function PanelDataProvider({ children }: { children: ReactNode }) {
  const { cargarEstado } = useCertamen()

  const [eventos, setEventos] = useState<Evento[]>([])
  const [evento, setEvento] = useState<Evento | null>(null)
  const [estadosEvento, setEstadosEvento] = useState<Record<string, EstadoEvento>>({})
  const [candidatas, setCandidatas] = useState<Candidata[]>([])
  const [jurados, setJurados] = useState<Jurado[]>([])
  const [criterios, setCriterios] = useState<Criterio[]>([])
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([])
  const [detalles, setDetalles] = useState<EvaluacionDetalle[]>([])
  const [reglamentos, setReglamentos] = useState<ReglamentoEtapa[]>([])
  const [cargando, setCargando] = useState(true)
  const [cargandoInicial, setCargandoInicial] = useState(true)
  const eventoActivoIdRef = useRef<string | null>(null)

  const cargarDatos = useCallback(async (eventoIdParam?: string) => {
    setCargando(true)
    const supabase = getSupabase()

    try {
      const [evs, cr, regls, ests] = await Promise.all([
        supabase.from('eventos').select('*').order('created_at'),
        supabase.from('criterios').select('*').order('orden'),
        supabase.from('reglamento_etapa').select('*'),
        supabase.from('estado_evento').select('*'),
      ])

      if (evs.error) logError('eventos', evs.error.message)
      if (cr.error) logError('criterios', cr.error.message)

      const eventosLista = (evs.data ?? []) as Evento[]

      // Determinar el evento activo: el pedido explícito → el guardado → el más reciente.
      let activoId =
        eventoIdParam ??
        eventoActivoIdRef.current ??
        localStorage.getItem(KEY_EVENTO_ACTIVO) ??
        null
      const activo =
        (activoId ? eventosLista.find((e) => e.id === activoId) : undefined) ??
        eventosLista[eventosLista.length - 1] ??
        null
      activoId = activo?.id ?? null
      eventoActivoIdRef.current = activoId
      if (activoId) localStorage.setItem(KEY_EVENTO_ACTIVO, activoId)
      else localStorage.removeItem(KEY_EVENTO_ACTIVO)

      // Evaluaciones y detalles SOLO del evento activo: cada evento guarda sus
      // propias puntuaciones y al cambiar de evento se recuperan las suyas.
      let evalsData: Evaluacion[] = []
      if (activoId) {
        const { data } = await supabase.from('evaluaciones').select('*').eq('evento_id', activoId)
        evalsData = (data ?? []) as Evaluacion[]
      }
      let detsData: EvaluacionDetalle[] = []
      if (evalsData.length > 0) {
        const { data } = await supabase
          .from('evaluacion_detalles')
          .select('evaluacion_id, criterio_id, puntaje')
          .in('evaluacion_id', evalsData.map((e) => e.id))
        detsData = (data ?? []) as EvaluacionDetalle[]
      }

      // Candidatas SOLO del evento activo (más las legacy sin evento, si quedara
      // alguna por migrar): cada evento tiene su propia lista de participantes.
      let caData: Candidata[] = []
      if (activoId) {
        const { data } = await supabase
          .from('candidatas')
          .select('*')
          .or(`evento_id.eq.${activoId},evento_id.is.null`)
          .order('nombre')
        caData = (data ?? []) as Candidata[]
      }

      // Jurados SOLO del evento activo (más los legacy sin evento, si quedara
      // alguno por migrar): cada evento tiene sus propios jurados.
      let juData: Jurado[] = []
      if (activoId) {
        const { data } = await supabase
          .from('jurados')
          .select('*')
          .or(`evento_id.eq.${activoId},evento_id.is.null`)
          .order('codigo')
        juData = (data ?? []) as Jurado[]
      }

      const mapEstado: Record<string, EstadoEvento> = {}
      for (const est of (ests.data ?? []) as EstadoEvento[]) mapEstado[est.evento_id] = est

      setEventos(eventosLista)
      setEvento(activo)
      setEstadosEvento(mapEstado)
      setCandidatas(caData)
      setJurados(juData)
      setCriterios((cr.data ?? []) as Criterio[])
      setEvaluaciones(evalsData)
      setDetalles(detsData)
      setReglamentos((regls.data ?? []) as ReglamentoEtapa[])

      logFilas('panel: candidatas', caData)
      logFilas('panel: jurados', juData)
      logFilas('panel: criterios', cr.data ?? [])
      logFilas('panel: evaluaciones', evalsData)
    } finally {
      setCargandoInicial(false)
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  const recargar = useCallback(async () => {
    await cargarDatos(eventoActivoIdRef.current ?? undefined)
    await cargarEstado()
  }, [cargarDatos, cargarEstado])

  const seleccionarEvento = useCallback(
    async (id: string) => {
      eventoActivoIdRef.current = id
      await cargarDatos(id)
    },
    [cargarDatos],
  )

  // Realtime (sin polling): refresca el panel ante cambios en estado_evento,
  // evaluaciones (progreso 5/5) y jurados (conectados).
  useRealtime(['estado_evento', 'evaluaciones', 'jurados'], () => {
    void recargar()
  })

  // Estado (modo ensayo, etc.) del evento SELECCIONADO en el panel.
  const estadoEvento = useMemo(
    () => (evento ? (estadosEvento[evento.id] ?? null) : null),
    [estadosEvento, evento],
  )

  const valor = useMemo<PanelData>(
    () => ({
      eventos,
      evento,
      estadoEvento,
      candidatas,
      jurados,
      criterios,
      evaluaciones,
      detalles,
      reglamentos,
      cargando,
      cargandoInicial,
      recargar,
      seleccionarEvento,
    }),
    [
      eventos,
      evento,
      estadoEvento,
      candidatas,
      jurados,
      criterios,
      evaluaciones,
      detalles,
      reglamentos,
      cargando,
      cargandoInicial,
      recargar,
      seleccionarEvento,
    ],
  )

  return <PanelDataContext.Provider value={valor}>{children}</PanelDataContext.Provider>
}

export function usePanelData(): PanelData {
  const contexto = useContext(PanelDataContext)
  if (!contexto) throw new Error('usePanelData debe usarse dentro de PanelDataProvider.')
  return contexto
}