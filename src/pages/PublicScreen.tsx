import { useEffect, useMemo, useState } from 'react'
import { useCertamen } from '../context/CertamenContext'
import { getSupabase } from '../lib/supabase'
import { logConsulta, logError } from '../utils/devlog'
import { useRealtime } from '../utils/realtime'
import { calcularPromedioJurados, calcularTotales } from '../utils/scoring'
import logo from '../assets/Logo/logo.png'
import type { Evento, Evaluacion, EvaluacionDetalle, Criterio } from '../types/database'

interface CandidataInfo {
  id: string
  nombre: string
  grado: string
  seccion: string
}

interface PodioItem {
  nombre: string
  grado: string
  promedio: number
}

const AVATAR_COLORS = [
  'from-yellow-400 to-yellow-600',
  'from-gray-300 to-gray-500',
  'from-amber-600 to-amber-800',
]
const POSICION_LABELS = ['Primer Puesto', 'Segundo Puesto', 'Tercer Puesto']
const POSICION_BORDERS = ['border-yellow-400', 'border-gray-300', 'border-amber-600']
const POSICION_BG = ['bg-yellow-500/15', 'bg-gray-400/15', 'bg-amber-600/15']
const POSICION_TEXT = ['text-yellow-300', 'text-gray-200', 'text-amber-300']

export default function PublicScreen() {
  const { eventoCandidato, candidataActual, candidatas, cargarEstado } = useCertamen()
  const [evento, setEvento] = useState<Evento | null>(eventoCandidato)
  const [candidata, setCandidata] = useState<CandidataInfo | null>(null)
  const [estadoEv, setEstadoEv] = useState<string>('preparando')
  const [podio, setPodio] = useState<PodioItem[]>([])
  const [escenaRefresco, setEscenaRefresco] = useState(0)

  useEffect(() => {
    if (eventoCandidato) setEvento(eventoCandidato)
    if (candidataActual) {
      setCandidata({
        id: candidataActual.id,
        nombre: candidataActual.nombre,
        grado: candidataActual.grado,
        seccion: candidataActual.seccion,
      })
    }
  }, [eventoCandidato, candidataActual])

  // Realtime (sin polling): la pantalla se actualiza sola al cambiar el estado,
  // la escena o la candidata activa (estado_evento). También recalcula el podio.
  useRealtime(['estado_evento'], () => {
    void cargarEstado()
    setEscenaRefresco((n) => n + 1)
  })

  // Leer evento, candidata y estado desde estado_evento cuando cambia en vivo
  useEffect(() => {
    const cargarEstadoEv = async () => {
      try {
        const supabase = getSupabase()
        const { data } = await supabase
          .from('estado_evento')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (data) {
          const est = data as {
            estado: string
            candidata_actual_id: string | null
            evento_id: string
          }
          setEstadoEv(est.estado || 'preparando')
          if (est.evento_id && !evento) {
            const { data: evRaw } = await supabase
              .from('eventos')
              .select('*')
              .eq('id', est.evento_id)
              .maybeSingle()
            if (evRaw) setEvento(evRaw as Evento)
          }
          if (est.candidata_actual_id) {
            const { data: caRaw } = await supabase
              .from('candidatas')
              .select('*')
              .eq('id', est.candidata_actual_id)
              .maybeSingle()
            if (caRaw) setCandidata(caRaw as CandidataInfo)
          }
        }
      } catch {
        /* sin cambios */
      }
    }
    cargarEstadoEv()
  }, [candidataActual, cargarEstado, escenaRefresco, evento])

  // Cargar estado_evento si el contexto no lo trae (primer arranque)
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

        if (errEstado || !estadoRaw) return

        const est = estadoRaw as {
          evento_id: string
          candidata_actual_id: string | null
          estado: string
        }
        setEstadoEv(est.estado || 'preparando')

        if (est.evento_id) {
          const { data: evRaw } = await supabase
            .from('eventos')
            .select('*')
            .eq('id', est.evento_id)
            .maybeSingle()
          if (evRaw) setEvento(evRaw as Evento)
        }

        if (est.candidata_actual_id) {
          const { data: caRaw } = await supabase
            .from('candidatas')
            .select('*')
            .eq('id', est.candidata_actual_id)
            .maybeSingle()
          if (caRaw) setCandidata(caRaw as CandidataInfo)
        }
      } catch (err) {
        logError('PublicScreen', err instanceof Error ? err.message : String(err))
      }
    })()
  }, [eventoCandidato, candidataActual])

  // Escena derivada automáticamente del estado del evento
  const escena =
    estadoEv === 'evaluando'
      ? 'evaluacion'
      : estadoEv === 'esperando_jurados' || estadoEv === 'resultados_listos'
        ? 'esperando'
        : estadoEv === 'publicado'
          ? 'resultados'
          : 'inicio'

  // Cargar ranking para escena de resultados
  useEffect(() => {
    if (escena !== 'resultados') return

    ;(async () => {
      try {
        const supabase = getSupabase()
        const [evalsRes, detsRes, crRes] = await Promise.all([
          supabase.from('evaluaciones').select('*'),
          supabase.from('evaluacion_detalles').select('evaluacion_id, criterio_id, puntaje'),
          supabase.from('criterios').select('*'),
        ])

        const evals = (evalsRes.data ?? []) as Evaluacion[]
        const dets = (detsRes.data ?? []) as EvaluacionDetalle[]
        const crs = (crRes.data ?? []) as Criterio[]
        const desempateIds = new Set(crs.filter((c) => c.es_desempate).map((c) => c.id))

        const porCandidata = candidatas.map((c) => {
          const evalsC = evals.filter(
            (e) => e.candidata_id === c.id && e.estado === 'completada' && !e.es_ensayo,
          )
          const bases = evalsC.map((ev) => {
            const detsEv = dets
              .filter((d) => d.evaluacion_id === ev.id)
              .map((d) => ({ criterio_id: d.criterio_id, puntaje: Number(d.puntaje) }))
            return calcularTotales(detsEv, desempateIds).base
          })
          return {
            nombre: c.nombre,
            grado: c.grado,
            promedio: calcularPromedioJurados(bases),
          }
        })

        porCandidata.sort((a, b) => b.promedio - a.promedio)
        setPodio(porCandidata.slice(0, 3))
      } catch (err) {
        logError('PublicScreen podium', err instanceof Error ? err.message : String(err))
      }
    })()
  }, [escena, candidatas])

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 text-center">
        {escena === 'inicio' && <EscenaInicio evento={evento} />}
        {escena === 'evaluacion' && <EscenaEvaluacion candidata={candidata} evento={evento} />}
        {escena === 'esperando' && <EscenaEsperando candidata={candidata} />}
        {escena === 'resultados' && <EscenaResultados podio={podio} />}

        <p className="mt-auto pt-8 text-[10px] uppercase tracking-[0.25em] text-navy-600">
          SIGEC — Transmisión en tiempo real
        </p>
      </div>

      <FooterIE />
    </div>
  )
}

/* ─── Footer de la I.E. Jiménez Pimentel ─────────────────────────────── */

function FooterIE() {
  return (
    <footer className="border-t border-white/10 bg-navy-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-2 px-6 py-5 text-center">
        <img src={logo} alt="Logo de la I.E." className="h-10 w-10 object-contain" />
        <p className="text-sm font-semibold text-white">
          I.E. Jiménez Pimentel
        </p>
        <p className="text-xs text-navy-300">
          Elección y Coronación de Señorita Jiménez Pimentel 2026
        </p>
      </div>
    </footer>
  )
}

/* ─── Escena 1: Inicio del evento ─────────────────────────────────────── */

function EscenaInicio({ evento }: { evento: Evento | null }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-gold-500/20 ring-1 ring-gold-500/40">
        <img src={logo} alt="Logo" className="h-18 w-18 object-contain" />
      </div>
      {evento ? (
        <>
          <h1 className="text-4xl font-bold text-white sm:text-6xl">{evento.nombre}</h1>
          <p className="text-lg text-navy-300 sm:text-xl">Etapa: {evento.etapa}</p>
        </>
      ) : (
        <div className="space-y-3">
          <div className="mx-auto h-12 w-80 animate-pulse rounded bg-navy-700" />
          <div className="mx-auto h-6 w-48 animate-pulse rounded bg-navy-700" />
        </div>
      )}
      <p className="text-sm font-semibold uppercase tracking-[0.4em] text-gold-400 animate-pulse">
        Bienvenidos
      </p>
    </div>
  )
}

/* ─── Escena 2: Candidata en evaluación ───────────────────────────────── */

function EscenaEvaluacion({
  candidata,
  evento,
}: {
  candidata: CandidataInfo | null
  evento: Evento | null
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gold-400">
        Candidata en evaluación
      </p>

      {candidata ? (
        <div className="rounded-3xl border border-gold-500/30 bg-gradient-to-b from-navy-900/90 to-navy-950/90 px-10 py-12 shadow-2xl shadow-gold-500/10 transition-all duration-700">
          <h2 className="text-5xl font-bold text-white sm:text-7xl">{candidata.nombre}</h2>
          <p className="mt-4 text-xl text-navy-300 sm:text-2xl">
            {candidata.grado} · Sección {candidata.seccion}
          </p>
        </div>
      ) : (
        <p className="text-xl text-navy-500">Esperando selección…</p>
      )}

      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400 animate-pulse">
        Evaluación en curso
      </p>

      {evento && (
        <p className="text-xs text-navy-500">{evento.etapa}</p>
      )}
    </div>
  )
}

/* ─── Escena 3: Esperando jurados ────────────────────────────────────── */

function EscenaEsperando({ candidata }: { candidata: CandidataInfo | null }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-400">
        Esperando resultados de los jurados
      </p>

      {candidata && (
        <div className="rounded-3xl border border-white/10 bg-navy-900/70 px-10 py-10">
          <h2 className="text-4xl font-bold text-white sm:text-5xl">{candidata.nombre}</h2>
          <p className="mt-3 text-lg text-navy-300">
            {candidata.grado} · Sección {candidata.seccion}
          </p>
        </div>
      )}

      <div className="flex items-center justify-center gap-2">
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-amber-400 [animation-delay:0ms]" />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-amber-400 [animation-delay:150ms]" />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-amber-400 [animation-delay:300ms]" />
      </div>

      <p className="text-sm text-navy-400">Los jurados están evaluando…</p>
    </div>
  )
}

/* ─── Escena 4: Resultados (podio animado) ────────────────────────────── */

function EscenaResultados({ podio }: { podio: PodioItem[] }) {
  const items = useMemo(() => {
    if (podio.length === 0) return []
    const orden = podio.length === 1 ? [0] : podio.length === 2 ? [1, 0] : [1, 0, 2]
    return orden.map((originalIdx) => ({
      ...podio[originalIdx],
      podiumIdx: originalIdx,
    }))
  }, [podio])

  if (items.length === 0) {
    return (
      <div className="space-y-4 animate-fade-in">
        <p className="text-3xl font-bold text-white">Resultados</p>
        <p className="text-navy-400">Aún no hay evaluaciones completas.</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-3xl animate-fade-in">
      <p className="mb-10 text-sm font-semibold uppercase tracking-[0.35em] text-purple-400">
        Resultados del certamen
      </p>

      <div className="flex items-end justify-center gap-4 sm:gap-8">
        {items.map((item) => {
          const altura = item.podiumIdx === 0 ? 'min-h-[220px]' : item.podiumIdx === 1 ? 'min-h-[170px]' : 'min-h-[140px]'
          return (
            <div
              key={item.nombre}
              className={`flex flex-1 flex-col items-center animate-slide-up`}
              style={{ animationDelay: `${item.podiumIdx * 300}ms` }}
            >
              {/* Avatar */}
              <span
                className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br text-lg font-bold text-navy-950 ring-2 ${AVATAR_COLORS[item.podiumIdx]} ${POSICION_BORDERS[item.podiumIdx]}`}
              >
                {item.nombre
                  .split(/\s+/)
                  .map((p) => p[0])
                  .join('')
                  .slice(0, 2)}
              </span>

              {/* Nombre */}
              <p className={`mt-3 text-center text-sm font-bold sm:text-base ${POSICION_TEXT[item.podiumIdx]}`}>
                {item.nombre}
              </p>
              <p className="text-[11px] text-navy-400">{item.grado}</p>

              {/* Puesto */}
              <div
                className={`mt-3 flex w-full flex-col items-center rounded-t-2xl border-b-0 px-2 py-5 ${altura} ${POSICION_BG[item.podiumIdx]} border ${POSICION_BORDERS[item.podiumIdx]} justify-end`}
              >
                <p className={`text-2xl font-bold sm:text-3xl ${POSICION_TEXT[item.podiumIdx]}`}>
                  {item.promedio.toFixed(2)}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-navy-300">
                  pts
                </p>
              </div>

              {/* Etiqueta del puesto */}
              <span
                className={`mt-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${POSICION_BG[item.podiumIdx]} ${POSICION_TEXT[item.podiumIdx]} ring-1 ${POSICION_BORDERS[item.podiumIdx]}`}
              >
                {POSICION_LABELS[item.podiumIdx]}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
