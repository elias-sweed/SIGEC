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
import { logConsulta, logError } from '../utils/devlog'
import type { Candidata, Evento } from '../types/database'

export interface EstadoEvento {
  id: string
  evento_id: string
  candidata_actual_id: string | null
  estado: string
  pantalla_escena: string
  modo_ensayo: boolean
  updated_at: string
}

interface CertamenContextValue {
  eventoCandidato: Evento | null
  candidataActual: Candidata | null
  candidatas: Candidata[]
  estadoEvento: EstadoEvento | null
  cargando: boolean
  actualizarCandidata: (candidataId: string | null) => Promise<void>
  cargarEstado: () => Promise<{
    evento: Evento | null
    candidata: Candidata | null
    estado: EstadoEvento | null
  }>
}

const CertamenContext = createContext<CertamenContextValue | null>(null)

function leerRespaldo(): { evento: Evento | null; candidata: Candidata | null } {
  try {
    const crudo = window.localStorage.getItem('sigec-certamen')
    if (!crudo) return { evento: null, candidata: null }
    const datos = JSON.parse(crudo) as { evento?: Evento | null; candidata?: Candidata | null }
    return { evento: datos.evento ?? null, candidata: datos.candidata ?? null }
  } catch {
    return { evento: null, candidata: null }
  }
}

export function CertamenProvider({ children }: { children: ReactNode }) {
  const [evento, setEvento] = useState<Evento | null>(null)
  const [candidata, setCandidata] = useState<Candidata | null>(null)
  const [candidatas, setCandidatas] = useState<Candidata[]>([])
  const [estadoEvento, setEstadoEvento] = useState<EstadoEvento | null>(null)
  const [cargando, setCargando] = useState(true)

  const cargarEstado = useCallback(async () => {
    try {
      const supabase = getSupabase()

      // 1) Consultar estado_evento sin FK hints (evita error 400 por constraint renombrada)
      logConsulta('estado_evento: select *, limit 1')
      const { data: estadoRaw, error: errEstado } = await supabase
        .from('estado_evento')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (errEstado) {
        logError('estado_evento', errEstado.message)
        throw errEstado
      }

      let ev: Evento | null = null
      let cand: Candidata | null = null
      let estado: EstadoEvento | null = null
      let sinEstado = false

      if (estadoRaw) {
        // Hay registro: obtener evento y candidata por separado (sin FK hints)
        estado = estadoRaw as unknown as EstadoEvento

        logConsulta(`evento_id=${estado.evento_id}`)
        const { data: eventoRaw } = await supabase
          .from('eventos')
          .select('*')
          .eq('id', estado.evento_id)
          .maybeSingle()
        ev = (eventoRaw ?? null) as Evento | null

        if (estado.candidata_actual_id) {
          logConsulta(`candidata_actual_id=${estado.candidata_actual_id}`)
          const { data } = await supabase
            .from('candidatas')
            .select('*')
            .eq('id', estado.candidata_actual_id)
            .maybeSingle()
          cand = (data ?? null) as Candidata | null
        }
      } else {
        // 2) No hay registro: sin estado activo. La creación ocurre
        //    únicamente al pulsar "Iniciar Evaluación" en el asistente.
        logConsulta('estado_evento vacío — sin estado activo')
        const { data: primerEvento } = await supabase
          .from('eventos')
          .select('*')
          .order('created_at')
          .limit(1)
          .maybeSingle()

        ev = (primerEvento ?? null) as Evento | null
        sinEstado = true
      }

      // Candidatas activas SOLO del evento en vivo (más legacy sin evento):
      // cada evento tiene su propia lista de participantes.
      let listaCandidatas: Candidata[] = []
      if (ev) {
        const { data } = await supabase
          .from('candidatas')
          .select('*')
          .eq('activa', true)
          .or(`evento_id.eq.${ev.id},evento_id.is.null`)
          .order('nombre')
        listaCandidatas = (data ?? []) as Candidata[]
        if (sinEstado) cand = listaCandidatas[0] ?? null
      }

      setEvento(ev)
      setCandidata(cand)
      setCandidatas(listaCandidatas)
      setEstadoEvento(estado)

      window.localStorage.setItem('sigec-certamen', JSON.stringify({ evento: ev, candidata: cand }))

      return { evento: ev, candidata: cand, estado }
    } catch (err) {
      logError('cargarEstado', err instanceof Error ? err.message : String(err))
      const respaldo = leerRespaldo()
      setEvento(respaldo.evento)
      setCandidata(respaldo.candidata)
      return { ...respaldo, estado: null }
    }
  }, [])

  const actualizarCandidata = useCallback(
    async (candidataId: string | null) => {
      const supabase = getSupabase()

      const { data: actual } = await supabase
        .from('estado_evento')
        .select('evento_id')
        .limit(1)
        .maybeSingle()

      if (!actual) {
        logError('actualizarCandidata', 'No se encontró registro en estado_evento')
        return
      }

      logConsulta(`Actualizando estado_evento: candidata_actual_id=${candidataId}`)
      const { error } = await supabase
        .from('estado_evento')
        .update({ candidata_actual_id: candidataId, updated_at: new Date().toISOString() })
        .eq('evento_id', actual.evento_id)

      if (error) {
        logError('estado_evento update', error.message)
        throw error
      }

      await cargarEstado()
    },
    [cargarEstado],
  )

  useEffect(() => {
    cargarEstado().finally(() => setCargando(false))
  }, [cargarEstado])

  const valor = useMemo<CertamenContextValue>(
    () => ({
      eventoCandidato: evento,
      candidataActual: candidata,
      candidatas,
      estadoEvento,
      cargando,
      actualizarCandidata,
      cargarEstado,
    }),
    [evento, candidata, candidatas, estadoEvento, cargando, actualizarCandidata, cargarEstado],
  )

  return <CertamenContext.Provider value={valor}>{children}</CertamenContext.Provider>
}

export function useCertamen(): CertamenContextValue {
  const contexto = useContext(CertamenContext)
  if (!contexto) throw new Error('useCertamen debe usarse dentro de CertamenProvider.')
  return contexto
}
