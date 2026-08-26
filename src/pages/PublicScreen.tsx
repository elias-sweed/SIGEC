import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { useCertamen } from '../context/CertamenContext'
import { getSupabase } from '../lib/supabase'
import { logConsulta, logError } from '../utils/devlog'
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

        const estado = estadoRaw as { evento_id: string; candidata_actual_id: string | null }

        if (estado.evento_id) {
          logConsulta(`PublicScreen: obtener evento id=${estado.evento_id}`)
          const { data: evRaw } = await supabase
            .from('eventos')
            .select('*')
            .eq('id', estado.evento_id)
            .maybeSingle()
          if (evRaw) setEvento(evRaw as Evento)
        }

        if (estado.candidata_actual_id) {
          logConsulta(`PublicScreen: obtener candidata id=${estado.candidata_actual_id}`)
          const { data: caRaw } = await supabase
            .from('candidatas')
            .select('nombre, grado, seccion')
            .eq('id', estado.candidata_actual_id)
            .maybeSingle()
          if (caRaw) setCandidata(caRaw as CandidataInfo)
        }
      } catch (err) {
        logError('PublicScreen', err instanceof Error ? err.message : String(err))
      }
    })()
  }, [eventoCandidato, candidataActual])

  return (
    <>
      <PageHeader
        eyebrow="Transmisión en vivo"
        title="Pantalla Pública"
        description="Información del certamen proyectada para la audiencia. Actualiza al recargar la página."
      />

      <div className="mx-auto mt-10 max-w-lg space-y-8 text-center">
        <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-8">
          {evento ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
                Evento en curso
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">{evento.nombre}</h2>
              <span className="mt-3 inline-block rounded-full bg-gold-500/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-gold-300">
                Etapa: {evento.etapa}
              </span>
            </>
          ) : (
            <>
              <div className="mx-auto mb-3 h-6 w-48 animate-pulse rounded bg-navy-700" />
              <div className="mx-auto h-8 w-72 animate-pulse rounded bg-navy-700" />
            </>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
            Candidata actual
          </p>
          {candidata ? (
            <>
              <h3 className="mt-2 text-3xl font-bold text-white sm:text-4xl">{candidata.nombre}</h3>
              <p className="mt-2 text-lg text-navy-200">
                {candidata.grado} · Sección {candidata.seccion}
              </p>
            </>
          ) : (
            <p className="mt-3 text-lg text-navy-300">Aún no se ha seleccionado candidata</p>
          )}
        </div>

        {candidata && (
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400">
            Evaluación en curso
          </p>
        )}
      </div>
    </>
  )
}
