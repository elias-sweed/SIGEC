import { useEffect, useMemo, useState } from 'react'
import { useCertamen } from '../context/CertamenContext'
import { getSupabase } from '../lib/supabase'
import { logConsulta, logError } from '../utils/devlog'
import { useRealtime } from '../utils/realtime'
import { calcularPromedioJurados, calcularTotales } from '../utils/scoring'
import logo from '../assets/Logo/logo.png'
import Aurora from '../components/effects/Aurora'
import AuroraText from '../components/effects/AuroraText'
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

// La coronación es el viernes a las 7:00 PM. Calculamos el próximo objetivo
// de forma robusta: el día siguiente a las 19:00 (mañana).
function calcularObjetivo(): Date {
  const t = new Date()
  t.setDate(t.getDate() + 1)
  t.setHours(19, 0, 0, 0)
  return t
}

export default function PublicScreen() {
  const { eventoCandidato, candidataActual, candidatas, cargarEstado } = useCertamen()
  const [evento, setEvento] = useState<Evento | null>(eventoCandidato)
  const [candidata, setCandidata] = useState<CandidataInfo | null>(null)
  const [estadoEv, setEstadoEv] = useState<string>('preparando')
  const [podio, setPodio] = useState<PodioItem[]>([])
  const [escenaRefresco, setEscenaRefresco] = useState(0)
  const [cargandoInicial, setCargandoInicial] = useState(true)

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
      } finally {
        setCargandoInicial(false)
      }
    }
    cargarEstadoEv()
  }, [candidataActual, cargarEstado, escenaRefresco, evento])

  // Cargar estado_evento si el contexto no lo trae (primer arranque)
  useEffect(() => {
    if (eventoCandidato && candidataActual) {
      setCargandoInicial(false)
      return
    }

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
      } finally {
        setCargandoInicial(false)
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
    if (!evento?.id) return

    ;(async () => {
      try {
        const supabase = getSupabase()
        const [evalsRes, detsRes, crRes] = await Promise.all([
          supabase.from('evaluaciones').select('*').eq('evento_id', evento.id),
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
  }, [escena, candidatas, evento?.id])

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-navy-950">
      {/* Fondo aurora a pantalla completa */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <Aurora
          colorStops={['#2f4876', '#c9a227', '#0d1a2e']}
          amplitude={1.1}
          blend={0.55}
          speed={0.9}
          lightMode
        />
        {/* Velo oscuro para legibilidad del texto */}
        <div className="absolute inset-0 bg-radial from-navy-950/80 via-navy-950/55 to-navy-950/90" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-navy-950 to-transparent" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 text-center">
          {cargandoInicial ? (
            <div className="space-y-6 animate-pulse">
              <div className="mx-auto h-20 w-20 rounded-2xl bg-navy-700" />
              <div className="mx-auto h-10 w-80 max-w-full rounded bg-navy-700" />
              <div className="mx-auto h-6 w-48 rounded bg-navy-700" />
              <div className="mx-auto h-4 w-64 rounded bg-navy-700" />
            </div>
          ) : (
            <>
              {escena === 'inicio' && <EscenaInicio evento={evento} candidatas={candidatas} />}
              {escena === 'evaluacion' && <EscenaEvaluacion candidata={candidata} evento={evento} />}
              {escena === 'esperando' && <EscenaEsperando candidata={candidata} />}
              {escena === 'resultados' && <EscenaResultados podio={podio} />}
            </>
          )}
        </div>

        <FooterIE />
      </div>
    </div>
  )
}

/* ─── Footer de la I.E. Jiménez Pimentel ─────────────────────────────── */

function FooterIE() {
  return (
    <footer className="relative border-t border-white/10 bg-navy-950/70 backdrop-blur">
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

/* ─── Corona SVG (emblema decorativo) ────────────────────────────────── */

function IconoCorona({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M2 19.5h20M3 8l4.5 4L12 5l4.5 7L21 8l-1 9.5H4L3 8Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* ─── Escena 1: Inicio del evento ─────────────────────────────────────── */

function EscenaInicio({
  evento,
  candidatas,
}: {
  evento: Evento | null
  candidatas: Array<{ id: string; nombre: string }>
}) {
  return (
    <div className="w-full max-w-5xl space-y-8 animate-fade-in">
      {/* Emblema: corona + logo grande, protagonizando */}
      <div className="relative mx-auto flex h-36 w-36 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-gold-500/20 blur-2xl animate-pulse-glow" />
        <span className="absolute inset-0 rounded-full bg-linear-to-b from-gold-400/40 to-gold-600/10 ring-2 ring-gold-500/50 shadow-2xl shadow-gold-500/40" />
        <IconoCorona className="absolute -top-8 h-12 w-12 text-gold-300 drop-shadow-[0_0_12px_rgba(223,191,98,0.8)]" />
        <img src={logo} alt="Logo" className="h-20 w-20 object-contain drop-shadow-[0_0_20px_rgba(223,191,98,0.35)]" />
      </div>

      {evento ? (
        <>
          {/* Título más pequeño, con gradiente aurora animado */}
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            <AuroraText
              className="drop-shadow-[0_0_25px_rgba(223,191,98,0.35)]"
              colors={['#ecd68f', '#dfbf62', '#c9a227', '#ffffff', '#f5e7bd']}
              speed={1.4}
            >
              {evento.nombre}
            </AuroraText>
          </h1>
          <p className="inline-flex items-center gap-2 rounded-full border border-gold-500/40 bg-gold-500/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-[0.3em] text-gold-300">
            <IconoCorona className="h-4 w-4" />
            {evento.etapa}
          </p>
        </>
      ) : (
        <div className="space-y-3">
          <div className="mx-auto h-12 w-80 animate-pulse rounded bg-navy-700" />
          <div className="mx-auto h-6 w-48 animate-pulse rounded bg-navy-700" />
        </div>
      )}

      {/* Fecha, hora, lugar + contador regresivo */}
      <div className="mx-auto max-w-md space-y-4">
        <p className="text-base font-semibold text-white">
          Viernes · 7:00 PM · Coliseo de la I.E.
        </p>
        <ContadorRegresivo />
      </div>

      <p className="text-sm font-semibold uppercase tracking-[0.4em] text-white/70">
        Bienvenidos
      </p>

      {/* Candidatas desfilando (avatares con iniciales) */}
      {candidatas.length > 0 && <MarqueeCandidatas candidatas={candidatas} />}
    </div>
  )
}

/* ─── Contador regresivo hasta el inicio (viernes 7:00 PM) ───────────── */

function ContadorRegresivo() {
  const objetivo = useMemo(calcularObjetivo, [])

  const [restante, setRestante] = useState(() => {
    const diff = Math.max(0, objetivo.getTime() - Date.now())
    return diff
  })

  useEffect(() => {
    const id = setInterval(() => {
      setRestante(Math.max(0, objetivo.getTime() - Date.now()))
    }, 1000)
    return () => clearInterval(id)
  }, [objetivo])

  const totalSeg = Math.floor(restante / 1000)
  const dias = Math.floor(totalSeg / 86400)
  const horas = Math.floor((totalSeg % 86400) / 3600)
  const minutos = Math.floor((totalSeg % 3600) / 60)
  const segundos = totalSeg % 60

  const bloques = [
    { valor: dias, etiqueta: 'Días' },
    { valor: horas, etiqueta: 'Horas', dos: true },
    { valor: minutos, etiqueta: 'Min', dos: true },
    { valor: segundos, etiqueta: 'Seg', dos: true },
  ]

  return (
    <div className="flex items-center justify-center gap-3">
      {bloques.map((b) => (
        <div
          key={b.etiqueta}
          className="flex w-16 flex-col items-center rounded-2xl border border-white/10 bg-navy-900/60 px-2 py-3 backdrop-blur"
        >
          <span className="text-2xl font-black tabular-nums text-gold-300">
            {String(b.valor).padStart(b.dos ? 2 : 1, '0')}
          </span>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-navy-300">
            {b.etiqueta}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ─── Marquee de candidatas (avatares con iniciales) ─────────────────── */

const AVATAR_MARQUEE_COLORS = [
  'from-gold-400 to-gold-600',
  'from-navy-400 to-navy-600',
  'from-rose-400 to-rose-600',
  'from-emerald-400 to-emerald-600',
  'from-sky-400 to-sky-600',
  'from-purple-400 to-purple-600',
]

function iniciales(nombre: string) {
  return nombre
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function MarqueeCandidatas({
  candidatas,
}: {
  candidatas: Array<{ id: string; nombre: string }>
}) {
  // Duplicamos la lista para lograr el desplazamiento continuo (marquee)
  const lista = [...candidatas, ...candidatas]

  return (
    <div className="relative w-full overflow-hidden border-y border-white/10 bg-navy-950/40 py-5 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-navy-950 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-navy-950 to-transparent" />

      <div className="flex w-max animate-marquee gap-5 pl-5">
        {lista.map((c, idx) => (
          <div
            key={`${c.id}-${idx}`}
            className="flex w-20 flex-col items-center gap-2"
          >
            <span
              className={`flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br text-lg font-bold text-white ring-2 ring-white/20 shadow-lg ${AVATAR_MARQUEE_COLORS[idx % AVATAR_MARQUEE_COLORS.length]}`}
            >
              {iniciales(c.nombre)}
            </span>
            <span className="max-w-20 truncate text-[11px] font-semibold text-white/80">
              {c.nombre}
            </span>
          </div>
        ))}
      </div>
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
        <div className="rounded-3xl border border-gold-500/30 bg-linear-to-b from-navy-900/90 to-navy-950/90 px-10 py-12 shadow-2xl shadow-gold-500/10 transition-all duration-700">
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
                className={`flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br text-lg font-bold text-navy-950 ring-2 ${AVATAR_COLORS[item.podiumIdx]} ${POSICION_BORDERS[item.podiumIdx]}`}
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
