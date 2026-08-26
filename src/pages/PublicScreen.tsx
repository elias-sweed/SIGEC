import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { useCertamen } from '../context/CertamenContext'
import { getSupabase } from '../lib/supabase'
import { logConsulta, logError } from '../utils/devlog'
import { EVENT_STATE_LABELS, EVENT_STATE_COLORS, type EventState } from '../constants/eventStates'
import type { Evento } from '../types/database'

interface CandidataInfo {
  nombre: string
  grado: string
  seccion: string
}

export default function PublicScreen() {
  const { eventoCandidato, candidataActual } = useCertamen()
  const [evento, setEvento] = useState<Evento | null>(eventoCandidato)
  const [candidata, setCandidata] = useState<CandidataInfo | null>(
    candidataActual
      ? { nombre: candidataActual.nombre, grado: candidataActual.grado, seccion: candidataActual.seccion }
      : null,
  )
  const [estado, setEstado] = useState<EventState>(
    (eventoCandidato?.estado as EventState) || 'preparando',
  )

  useEffect(() => {
    if (eventoCandidato) setEvento(eventoCandidato)
    if (candidataActual) {
      setCandidata({ nombre: candidataActual.nombre, grado: candidataActual.grado, seccion: candidataActual.seccion })
    }
  }, [eventoCandidato, candidataActual])

  useEffect(() => {
    if (eventoCandidato && candidataActual) return

    ;(async () => {
      try {
        const supabase = getSupabase()

        logConsulta('PublicScreen: buscar estado_evento')
        const { data: estadoRaw, error: errEstado } = await supabase
          .from('estado_evento')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (errEstado) {
          logError('PublicScreen estado_evento', errEstado.message)
          return
        }
        if (!estadoRaw) return

        const est = estadoRaw as { evento_id: string; candidata_actual_id: string | null; estado: string }
        setEstado((est.estado as EventState) || 'preparando')

        if (est.evento_id) {
          logConsulta(`PublicScreen: obtener evento id=${est.evento_id}`)
          const { data: evRaw } = await supabase
            .from('eventos')
            .select('*')
            .eq('id', est.evento_id)
            .maybeSingle()
          if (evRaw) setEvento(evRaw as Evento)
        }

        if (est.candidata_actual_id) {
          logConsulta(`PublicScreen: obtener candidata id=${est.candidata_actual_id}`)
          const { data: caRaw } = await supabase
            .from('candidatas')
            .select('nombre, grado, seccion')
            .eq('id', est.candidata_actual_id)
            .maybeSingle()
          if (caRaw) setCandidata(caRaw as CandidataInfo)
        }
      } catch (err) {
        logError('PublicScreen', err instanceof Error ? err.message : String(err))
      }
    })()
  }, [eventoCandidato, candidataActual])

  const isPublished = estado === 'publicado'
  const stateColors = EVENT_STATE_COLORS[estado]

  return (
    <>
      <PageHeader
        eyebrow="Transmisión en vivo"
        title="Pantalla Pública"
        description="Información del certamen proyectada para la audiencia."
      />

      <div className="mx-auto mt-8 max-w-2xl space-y-8 text-center">
        {/* Logo / nombre evento */}
        <div className="space-y-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-500/20 text-3xl">
            🏆
          </div>
          {evento ? (
            <>
              <h2 className="text-3xl font-bold text-white sm:text-4xl">{evento.nombre}</h2>
              <p className="text-sm text-navy-400">Etapa: {evento.etapa}</p>
            </>
          ) : (
            <>
              <div className="mx-auto h-10 w-72 animate-pulse rounded bg-navy-700" />
              <div className="mx-auto h-4 w-32 animate-pulse rounded bg-navy-700" />
            </>
          )}
        </div>

        {/* Estado del evento */}
        <div className="flex justify-center">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold ring-1 transition-all duration-500 ${stateColors.bg} ${stateColors.text} ${stateColors.ring}`}
          >
            <span className="h-2 w-2 rounded-full bg-current" />
            {EVENT_STATE_LABELS[estado]}
          </span>
        </div>

        {/* Candidata actual o resultado */}
        {isPublished ? (
          <div className="rounded-2xl border border-purple-500/20 bg-purple-500/10 p-10 transition-all duration-500">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-purple-400">
              Resultados publicados
            </p>
            <div className="mt-6 text-navy-400">
              <p className="text-sm">Los puntajes se mostrarán próximamente.</p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-10 transition-all duration-300">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
              Candidata actual
            </p>
            {candidata ? (
              <>
                <h3 className="mt-3 text-4xl font-bold text-white sm:text-5xl">
                  {candidata.nombre}
                </h3>
                <p className="mt-2 text-lg text-navy-300">
                  {candidata.grado} · Sección {candidata.seccion}
                </p>
              </>
            ) : (
              <p className="mt-4 text-lg text-navy-500">Esperando selección…</p>
            )}
          </div>
        )}

        {/* Indicador de evaluación activa */}
        {estado === 'evaluando' && candidata && (
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400 animate-pulse">
            Evaluación en curso
          </p>
        )}
      </div>
    </>
  )
}
