import { useCallback, useEffect, useMemo, useState } from 'react'
import { useCertamen } from '../context/CertamenContext'
import { getSupabase } from '../lib/supabase'
import { logError } from '../utils/devlog'
import { useRealtime } from '../utils/realtime'
import { calcularPromedioJurados, calcularTotales } from '../utils/scoring'
import logo from '../assets/Logo/logo.png'
import Aurora from '../components/effects/Aurora'
import AuroraText from '../components/effects/AuroraText'
import CandidatasGrid from '../components/public/CandidatasGrid'
import PanelJurados, { type JuradoEnVivo } from '../components/public/PanelJurados'
import type { Candidata, Evento, Evaluacion, EvaluacionDetalle, Criterio } from '../types/database'

interface PodioItem {
  nombre: string
  grado: string
  seccion: string
  promedio: number
}

// La coronación es el viernes a las 7:00 PM. Calculamos el próximo objetivo
// de forma robusta: el día siguiente a las 19:00 (mañana).
function calcularObjetivo(): Date {
  const t = new Date("2026-09-04")
  t.setDate(t.getDate() + 1)
  t.setHours(20, 0, 0, 0)
  return t
}

export default function PublicScreen() {
  const { eventoCandidato, candidatas, cargarEstado } = useCertamen()
  const [evento, setEvento] = useState<Evento | null>(eventoCandidato)
  const [estadoEv, setEstadoEv] = useState<string>('preparando')
  const [podio, setPodio] = useState<PodioItem[]>([])
  const [jurados, setJurados] = useState<JuradoEnVivo[]>([])
  const [evaluadasIds, setEvaluadasIds] = useState<Set<string>>(new Set())
  const [cargandoInicial, setCargandoInicial] = useState(true)

  useEffect(() => {
    if (eventoCandidato) setEvento(eventoCandidato)
  }, [eventoCandidato])

  // Carga en vivo: estado, evento, jurados conectados y candidatas evaluadas
  const cargarEnVivo = useCallback(async () => {
    const supabase = getSupabase()

    try {
      const { data: estadoData } = await supabase
        .from('estado_evento')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      let ev = evento
      if (estadoData) {
        const est = estadoData as { estado: string; evento_id: string }
        setEstadoEv(est.estado || 'preparando')
        if (est.evento_id && !ev) {
          const { data: evRaw } = await supabase
            .from('eventos')
            .select('*')
            .eq('id', est.evento_id)
            .maybeSingle()
          if (evRaw) {
            ev = evRaw as Evento
            setEvento(ev)
          }
        }
      } else {
        setEstadoEv('preparando')
      }

      const eventoId = ev?.id

      const [juradosRes, evalsRes] = await Promise.all([
        supabase
          .from('jurados')
          .select('id, nombre, codigo, en_sesion, candidata_actual_id')
          .eq('activado', true),
        eventoId
          ? supabase
              .from('evaluaciones')
              .select('candidata_id')
              .eq('evento_id', eventoId)
              .eq('estado', 'completada')
              .eq('es_ensayo', false)
          : Promise.resolve({ data: [] as Array<{ candidata_id: string }> }),
      ])

      setJurados((juradosRes.data ?? []) as JuradoEnVivo[])
      const evals = (evalsRes.data ?? []) as Array<{ candidata_id: string }>
      setEvaluadasIds(new Set(evals.map((e) => e.candidata_id)))
    } catch (err) {
      logError('PublicScreen en vivo', err instanceof Error ? err.message : String(err))
    } finally {
      setCargandoInicial(false)
    }
  }, [evento])

  useEffect(() => {
    void cargarEnVivo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Refresco automático de respaldo: además del realtime, se vuelve a cargar
  // cada pocos segundos para garantizar que la pantalla se actualice sola
  // (aunque el realtime de Supabase no esté configurado en la publicación).
  useEffect(() => {
    const id = setInterval(() => {
      void cargarEnVivo()
    }, 4000)
    return () => clearInterval(id)
  }, [cargarEnVivo])

  // Tiempo real: estado, jurados (candidata que evalúa cada uno) y evaluaciones
  const onEnVivo = useCallback(() => {
    void cargarEstado()
    void cargarEnVivo()
  }, [cargarEstado, cargarEnVivo])
  useRealtime(['estado_evento', 'jurados', 'evaluaciones'], onEnVivo)

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
            seccion: c.seccion,
            promedio: calcularPromedioJurados(bases),
          }
        })

        // 15 finalistas: los 3 de mejor promedio por cada grado (1-5)
        const porGrado = new Map<string, PodioItem[]>()
        for (const c of porCandidata) {
          if (!porGrado.has(c.grado)) porGrado.set(c.grado, [])
          porGrado.get(c.grado)!.push(c)
        }
        const finalistas: PodioItem[] = []
        for (const g of ['1', '2', '3', '4', '5']) {
          finalistas.push(
            ...(porGrado.get(g) ?? []).sort((a, b) => b.promedio - a.promedio).slice(0, 3),
          )
        }
        setPodio(finalistas)
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
        <div className="absolute inset-x-0 bottom-0 h-48 bg-linear-to-t from-navy-950 to-transparent" />
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
              {escena === 'inicio' && (
                <EscenaInicio evento={evento} candidatas={candidatas} evaluadasIds={evaluadasIds} />
              )}
              {escena === 'evaluacion' && (
                <EscenaEvaluacion candidatas={candidatas} jurados={jurados} />
              )}
              {escena === 'esperando' && (
                <EscenaEsperando
                  candidatas={candidatas}
                  evaluadasIds={evaluadasIds}
                  jurados={jurados}
                />
              )}
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
  evaluadasIds,
}: {
  evento: Evento | null
  candidatas: Candidata[]
  evaluadasIds: Set<string>
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
          Viernes · 8:00 PM · Coliseo de la I.E.
        </p>
        <ContadorRegresivo />
      </div>

      <p className="text-sm font-semibold uppercase tracking-[0.4em] text-white/70">
        Bienvenidos
      </p>

      {/* Candidatas en orden (grado → sección), con modal de foto */}
      {candidatas.length > 0 && (
        <CandidatasGrid candidatas={candidatas} evaluadasIds={evaluadasIds} />
      )}
    </div>
  )
}

/* ─── Contador regresivo hasta el inicio (viernes 8:00 PM) ───────────── */

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

/* ─── Escena 2: Evaluación en curso (panel de jurados + candidatas) ───── */

function EscenaEvaluacion({
  candidatas,
  jurados,
}: {
  candidatas: Candidata[]
  jurados: JuradoEnVivo[]
}) {
  return (
    <div className="w-full max-w-5xl space-y-8 animate-fade-in">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gold-400">
        Evaluación en curso
      </p>

      {/* Solo el panel de jurados: cada tarjeta con su nombre y la candidata que evalúa */}
      <PanelJurados jurados={jurados} candidatas={candidatas} />
    </div>
  )
}

/* ─── Escena 3: Esperando jurados ────────────────────────────────────── */

function EscenaEsperando({
  candidatas,
  evaluadasIds,
  jurados,
}: {
  candidatas: Candidata[]
  evaluadasIds: Set<string>
  jurados: JuradoEnVivo[]
}) {
  return (
    <div className="w-full max-w-5xl space-y-8 animate-fade-in">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-400">
        Esperando resultados de los jurados
      </p>

      {/* Cada jurado con la candidata que está evaluando */}
      <PanelJurados jurados={jurados} candidatas={candidatas} />

      <div className="flex items-center justify-center gap-2">
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-amber-400 [animation-delay:0ms]" />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-amber-400 [animation-delay:150ms]" />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-amber-400 [animation-delay:300ms]" />
      </div>

      <p className="text-sm text-navy-400">Los jurados están evaluando…</p>

      {candidatas.length > 0 && (
        <CandidatasGrid candidatas={candidatas} evaluadasIds={evaluadasIds} compacto />
      )}
    </div>
  )
}

/* ─── Escena 4: Resultados (15 finalistas, 3 por grado) ───────────────── */

const GRADO_ORDEN = ['1', '2', '3', '4', '5']
const COLORES_GRADO: Record<string, string> = {
  '1': '#c9a227',
  '2': '#5f7fae',
  '3': '#5bb98b',
  '4': '#b96b9c',
  '5': '#a06fe0',
}

function agruparPorGrado(finalistas: PodioItem[]): Map<string, PodioItem[]> {
  const map = new Map<string, PodioItem[]>()
  for (const f of finalistas) {
    const grupo = map.get(f.grado) ?? []
    grupo.push(f)
    map.set(f.grado, grupo)
  }
  return map
}

function EscenaResultados({ podio }: { podio: PodioItem[] }) {
  const porGrado = useMemo(() => agruparPorGrado(podio), [podio])

  if (podio.length === 0) {
    return (
      <div className="space-y-4 animate-fade-in">
        <p className="text-3xl font-bold text-white">Resultados</p>
        <p className="text-navy-400">Aún no hay evaluaciones completas.</p>
      </div>
    )
  }

  // Promedio por finalista (barras) y por grado (pastel)
  const maxProm = Math.max(...podio.map((p) => p.promedio), 1)
  const gradosPresentes = GRADO_ORDEN.filter((g) => porGrado.has(g))
  const promPorGrado = gradosPresentes.map((g) => {
    const grupo = porGrado.get(g)!
    const prom = grupo.reduce((s, f) => s + f.promedio, 0) / grupo.length
    return { grado: g, prom }
  })
  const totalPastel = promPorGrado.reduce((s, p) => s + p.prom, 0) || 1

  return (
    <div className="w-full max-w-6xl space-y-10 animate-fade-in">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-purple-400">
          Resultados del certamen
        </p>
        <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">
          15 finalistas{' '}
          <span className="bg-linear-to-r from-gold-300 to-purple-300 bg-clip-text text-transparent">
            (3 por grado)
          </span>
        </h2>
        <p className="mt-1 text-sm text-navy-400">
          Pasan a la etapa final los 3 mejores de cada grado, del 1° al 5°.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        {/* Gráfico de barras: promedio por finalista */}
        <div className="rounded-3xl border border-white/10 bg-navy-900/50 p-5 backdrop-blur">
          <p className="mb-5 text-sm font-bold uppercase tracking-widest text-gold-300">
            Promedio por finalista
          </p>
          <div className="grid grid-cols-5 gap-2 sm:gap-3">
            {gradosPresentes.map((g) => (
              <div key={g} className="flex flex-col gap-2">
                {porGrado.get(g)!.map((f) => {
                  const alto = Math.max(8, Math.round((f.promedio / maxProm) * 130))
                  return (
                    <div key={f.nombre} className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-bold tabular-nums text-white">
                        {f.promedio.toFixed(1)}
                      </span>
                      <div
                        className="w-full rounded-t-lg"
                        style={{
                          height: `${alto}px`,
                          background: `linear-gradient(to top, ${COLORES_GRADO[g]}cc, ${COLORES_GRADO[g]}55)`,
                          boxShadow: `0 0 12px ${COLORES_GRADO[g]}55`,
                        }}
                      />
                      <span className="truncate text-[9px] font-semibold text-navy-300" title={f.nombre}>
                        {f.nombre.split(/\s+/).map((p) => p[0]).join('').slice(0, 3)}
                      </span>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-center gap-4">
            {gradosPresentes.map((g) => (
              <span key={g} className="flex items-center gap-1.5 text-[11px] font-semibold text-navy-200">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORES_GRADO[g] }} />
                {g}° grado
              </span>
            ))}
          </div>
        </div>

        {/* Gráfico de pastel (dona): distribución por grado */}
        <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-navy-900/50 p-5 backdrop-blur">
          <p className="mb-3 self-start text-sm font-bold uppercase tracking-widest text-gold-300">
            Distribución por grado
          </p>
          <svg viewBox="0 0 200 200" className="h-44 w-44">
            <circle cx="100" cy="100" r="72" fill="none" stroke="#1b2740" strokeWidth="26" />
            <g transform="rotate(-90 100 100)">
              {promPorGrado.reduce<{ dash: number; offset: number; grado: string }[]>(
                (acc, p) => {
                  const dash = (p.prom / totalPastel) * 2 * Math.PI * 72
                  const prev = acc[acc.length - 1]?.offset ?? 0
                  acc.push({ dash, offset: prev - dash, grado: p.grado })
                  return acc
                },
                [],
              ).map((seg, i) => (
                <circle
                  key={i}
                  cx="100"
                  cy="100"
                  r="72"
                  fill="none"
                  stroke={COLORES_GRADO[seg.grado]}
                  strokeWidth="26"
                  strokeDasharray={`${seg.dash} ${2 * Math.PI * 72 - seg.dash}`}
                  strokeDashoffset={seg.offset}
                />
              ))}
            </g>
            <text x="100" y="96" textAnchor="middle" className="fill-white text-[26px] font-black">
              15
            </text>
            <text x="100" y="118" textAnchor="middle" className="fill-navy-300 text-[11px] font-semibold">
              finalistas
            </text>
          </svg>
          <ul className="mt-4 w-full space-y-1.5">
            {promPorGrado.map((p) => (
              <li key={p.grado} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-semibold text-navy-200">
                  <span className="h-3 w-3 rounded-full" style={{ background: COLORES_GRADO[p.grado] }} />
                  {p.grado}° grado
                </span>
                <span className="font-bold tabular-nums text-white">{p.prom.toFixed(1)} pts</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Tarjetas de los 15 finalistas agrupadas por grado */}
      <div className="space-y-8">
        {gradosPresentes.map((g) => {
          const grupo = porGrado.get(g)!
          return (
            <div key={g} className="space-y-3">
              <div className="flex items-center gap-3">
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl font-black text-navy-950"
                  style={{ background: COLORES_GRADO[g] }}
                >
                  {g}°
                </span>
                <h3 className="text-2xl font-black uppercase tracking-wider text-white">
                  Grado {g}
                </h3>
                <span className="h-px flex-1 bg-linear-to-r from-white/25 to-transparent" />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {grupo.map((f, i) => (
                  <div
                    key={f.nombre}
                    className="flex flex-col items-center rounded-3xl border border-white/10 bg-navy-900/50 p-5 text-center backdrop-blur"
                    style={{ boxShadow: `0 10px 30px -12px ${COLORES_GRADO[g]}66` }}
                  >
                    <span
                      className="mb-2 rounded-full px-3 py-0.5 text-[11px] font-black uppercase tracking-widest text-navy-950"
                      style={{ background: COLORES_GRADO[g] }}
                    >
                      {i === 0 ? '1º del grado' : i === 1 ? '2º del grado' : '3º del grado'}
                    </span>
                    <span className="text-4xl font-black tabular-nums text-white">
                      {f.promedio.toFixed(2)}
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-navy-400">
                      pts
                    </span>
                    <p className="mt-2 text-base font-bold text-white">{f.nombre}</p>
                    {/* Grado y sección GRANDES y notorios */}
                    <div className="mt-3 flex items-center gap-2">
                      <span
                        className="rounded-xl px-4 py-1.5 text-2xl font-black text-navy-950"
                        style={{ background: COLORES_GRADO[g] }}
                      >
                        {g}°
                      </span>
                      <span className="rounded-xl border-2 border-white/20 px-4 py-1 text-2xl font-black text-white">
                        Sección {f.seccion}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
