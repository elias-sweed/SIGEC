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
import type { Candidata, Evento } from '../types/database'

export interface EstadoEvento {
  id: string
  evento_id: string
  candidata_actual_id: string | null
  estado: string
  updated_at: string
}

interface CertamenContextValue {
  eventoCandidato: Evento | null
  candidataActual: Candidata | null
  estadoEvento: EstadoEvento | null
  cargando: boolean
  actualizarCandidata: (candidataId: string | null) => Promise<void>
  cargarEstado: () => Promise<{ evento: Evento | null; candidata: Candidata | null; estado: EstadoEvento | null }>
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
  const [estadoEvento, setEstadoEvento] = useState<EstadoEvento | null>(null)
  const [cargando, setCargando] = useState(true)

  const cargarEstado = useCallback(async () => {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('estado_evento')
        .select('*, evento!evento_id(*), candidata:candidata_actual_id(*)')
        .limit(1)
        .maybeSingle()

      if (error || !data) return { evento: null, candidata: null, estado: null }

      const ev = data as unknown as {
        evento: Evento
        candidata: Candidata | null
        id: string
        evento_id: string
        candidata_actual_id: string | null
        estado: string
        updated_at: string
      }

      const estado = {
        id: ev.id,
        evento_id: ev.evento_id,
        candidata_actual_id: ev.candidata_actual_id,
        estado: ev.estado,
        updated_at: ev.updated_at,
      }

      setEvento(ev.evento)
      setCandidata(ev.candidata ?? null)
      setEstadoEvento(estado)

      window.localStorage.setItem(
        'sigec-certamen',
        JSON.stringify({ evento: ev.evento, candidata: ev.candidata ?? null }),
      )

      return { evento: ev.evento, candidata: ev.candidata ?? null, estado }
    } catch {
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

      if (!actual) return

      await supabase
        .from('estado_evento')
        .update({ candidata_actual_id: candidataId, updated_at: new Date().toISOString() })
        .eq('evento_id', actual.evento_id)

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
      estadoEvento,
      cargando,
      actualizarCandidata,
      cargarEstado,
    }),
    [evento, candidata, estadoEvento, cargando, actualizarCandidata, cargarEstado],
  )

  return <CertamenContext.Provider value={valor}>{children}</CertamenContext.Provider>
}

export function useCertamen(): CertamenContextValue {
  const contexto = useContext(CertamenContext)
  if (!contexto) throw new Error('useCertamen debe usarse dentro de CertamenProvider.')
  return contexto
}
