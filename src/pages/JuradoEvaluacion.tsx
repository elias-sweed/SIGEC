import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCertamen } from '../context/CertamenContext'
import { getSupabase } from '../lib/supabase'
import { marcarEnSesion } from '../services/jurado.service'
import { calcularTotales } from '../utils/scoring'
import { logConsulta, logFilas, logError } from '../utils/devlog'
import { leerSesionJurado, limpiarSesionJurado } from '../utils/session'
import ScoreSlider from '../components/event/ScoreSlider'
import { EVENT_STATE_LABELS, type EventState } from '../constants/eventStates'
import type { Candidata, Criterio, Jurado } from '../types/database'

interface DetalleState {
  criterio_id: string
  puntaje: number
}

function iniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function JuradoEvaluacion() {
  const { candidatas, eventoCandidato: evento, estadoEvento } = useCertamen()
  const navigate = useNavigate()
  const sesion = leerSesionJurado()

  const [jurado, setJurado] = useState<Jurado | null>(null)
  const [candidataSel, setCandidataSel] = useState<Candidata | null>(null)
  const [evaluadasIds, setEvaluadasIds] = useState<Set<string>>(new Set())
  const [criterios, setCriterios] = useState<Criterio[]>([])
  const [detalles, setDetalles] = useState<DetalleState[]>([])
  const [enviado, setEnviado] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cargar jurado por sesión
  useEffect(() => {
    if (!sesion || jurado) return

    ;(async () => {
      const supabase = getSupabase()
      logConsulta(`JuradoEvaluacion: cargar jurado id=${sesion.id}`)
      const { data, error } = await supabase
        .from('jurados')
        .select('*')
        .eq('id', sesion.id)
        .maybeSingle()

      if (error || !data) {
        logError('JuradoEvaluacion jurado', error?.message ?? 'No encontrado')
        limpiarSesionJurado()
        navigate('/jurado', { replace: true })
        return
      }

      setJurado(data as Jurado)

      // Candidatas que este jurado ya evaluó (para mostrarlas en el selector)
      const { data: evals } = await supabase
        .from('evaluaciones')
        .select('candidata_id')
        .eq('jurado_id', (data as Jurado).id)
      if (evals) {
        setEvaluadasIds(new Set(evals.map((e) => e.candidata_id as string)))
      }
    })()
  }, [sesion, jurado, navigate])

  // Al elegir una candidata, cargar criterios de la etapa y la evaluación existente
  useEffect(() => {
    if (!jurado || !candidataSel || !evento?.etapa || !estadoEvento) return

    ;(async () => {
      const supabase = getSupabase()
      logConsulta(`Jurado ${jurado.codigo}: criterios etapa=${evento.etapa}`)
      const { data: criteriosData, error: criteriosError } = await supabase
        .from('criterios')
        .select('*')
        .eq('etapa', evento.etapa)
        .order('orden')

      if (criteriosError) {
        logError('Jurado criterios', criteriosError.message)
        return
      }

      logFilas('criterios', criteriosData ?? [])
      setCriterios((criteriosData ?? []) as Criterio[])

      const { data: existente, error: existenteError } = await supabase
        .from('evaluaciones')
        .select('id')
        .eq('candidata_id', candidataSel.id)
        .eq('jurado_id', jurado.id)
        .maybeSingle()

      if (existenteError) {
        logError('Jurado buscar evaluación', existenteError.message)
        return
      }

      if (existente) {
        setEnviado(true)
        const { data: detallesExistentes } = await supabase
          .from('evaluacion_detalles')
          .select('criterio_id, puntaje')
          .eq('evaluacion_id', existente.id)

        if (detallesExistentes) {
          setDetalles(detallesExistentes as DetalleState[])
        }
      } else {
        setEnviado(false)
        setDetalles([])
      }
    })()
  }, [jurado, candidataSel, evento?.etapa, estadoEvento])

  const salir = async () => {
    if (jurado) {
      await marcarEnSesion(jurado.id, false)
    }
    try {
      const supabase = getSupabase()
      await supabase.auth.signOut()
    } catch {
      /* sin sesión de auth — continuar */
    }
    limpiarSesionJurado()
    navigate('/jurado', { replace: true })
  }

  const handleSliderChange = (criterioId: string, value: number) => {
    setDetalles((prev) => {
      const existente = prev.find((d) => d.criterio_id === criterioId)
      if (existente) {
        return prev.map((d) => (d.criterio_id === criterioId ? { ...d, puntaje: value } : d))
      }
      return [...prev, { criterio_id: criterioId, puntaje: value }]
    })
  }

  const handleGuardar = async () => {
    if (!jurado || !candidataSel || !evento) return
    setSaving(true)
    setError(null)

    const supabase = getSupabase()

    logConsulta('Jurado: buscar evaluación existente')
    const { data: existente } = await supabase
      .from('evaluaciones')
      .select('id')
      .eq('candidata_id', candidataSel.id)
      .eq('jurado_id', jurado.id)
      .maybeSingle()

    let evaluacionId: string

    if (existente) {
      evaluacionId = existente.id
      logConsulta(`Jurado: actualizar evaluación existente ${evaluacionId}`)
      const { error: evalError } = await supabase
        .from('evaluaciones')
        .update({ estado: 'completada', updated_at: new Date().toISOString() })
        .eq('id', evaluacionId)

      if (evalError) {
        logError('Jurado actualizar evaluación', evalError.message)
        setError(evalError.message)
        setSaving(false)
        return
      }
    } else {
      logConsulta('Jurado: insertar nueva evaluación')
      const { data: nuevaEval, error: evalError } = await supabase
        .from('evaluaciones')
        .insert({
          evento_id: evento.id,
          candidata_id: candidataSel.id,
          jurado_id: jurado.id,
          estado: 'completada',
        })
        .select('id')
        .single()

      if (evalError || !nuevaEval) {
        logError('Jurado insertar evaluación', evalError?.message ?? 'No data')
        setError(evalError?.message ?? 'Error al insertar evaluación')
        setSaving(false)
        return
      }
      evaluacionId = nuevaEval.id
    }

    logConsulta(`Jurado: upsert ${detalles.length} detalles`)
    const { error: detallesError } = await supabase.from('evaluacion_detalles').upsert(
      detalles.map((d) => ({
        evaluacion_id: evaluacionId,
        criterio_id: d.criterio_id,
        puntaje: d.puntaje,
      })),
      { onConflict: 'evaluacion_id,criterio_id' },
    )

    if (detallesError) {
      logError('Jurado upsert detalles', detallesError.message)
      setError(detallesError.message)
      setSaving(false)
      return
    }

    logConsulta('Jurado: evaluación guardada con éxito')
    setEnviado(true)
    setSaving(false)

    // Marcar la candidata como evaluada para que se refleje en el selector
    if (candidataSel) {
      setEvaluadasIds((prev) => new Set(prev).add(candidataSel.id))
    }
  }

  if (!jurado) {
    return (
      <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-8 text-center">
        <p className="text-sm text-navy-400">Cargando sesión…</p>
      </div>
    )
  }

  const evaluando = estadoEvento?.estado === 'evaluando'
  const desempateIds = new Set(
    criterios.filter((c) => c.es_desempate).map((c) => c.id),
  )
  const { base: total, desempate: totalDesempate } = calcularTotales(detalles, desempateIds)
  const pctEvaluadas = candidatas.length > 0 ? (evaluadasIds.size / candidatas.length) * 100 : 0
  const pctTotal = Math.min(100, total)

  return (
    <div className="min-h-screen bg-navy-950 pb-28">
      {/* Encabezado compacto */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-navy-950/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold-500 text-base">
              🏆
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{jurado.nombre}</p>
              <p className="font-mono text-[10px] font-bold text-gold-400">{jurado.codigo}</p>
            </div>
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="text-center text-[10px] uppercase tracking-widest text-navy-500">Etapa</p>
            <p className="truncate text-xs font-semibold text-gold-400">{evento?.etapa ?? '—'}</p>
          </div>
          <button
            onClick={salir}
            className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-navy-200 transition hover:bg-navy-800 hover:text-white"
          >
            Salir
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-4">
        {!evaluando ? (
          <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-8 text-center">
            <p className="text-lg font-semibold text-navy-300">
              Estado actual:{' '}
              <span className="text-gold-400">
                {estadoEvento ? (EVENT_STATE_LABELS[estadoEvento.estado as EventState] ?? estadoEvento.estado) : 'Preparando'}
              </span>
            </p>
            <p className="mt-3 text-sm text-navy-500">
              El administrador debe iniciar la evaluación desde el Centro de Control. Esta pantalla se
              habilitará automáticamente cuando comience.{' '}
              {evento && `Etapa: ${evento.etapa}`}
            </p>
          </div>
        ) : !candidataSel ? (
          <>
            {/* Progreso general */}
            <div className="mb-4 rounded-2xl border border-white/10 bg-navy-900/70 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold uppercase tracking-widest text-gold-400">
                  Selecciona la candidata a evaluar
                </span>
                <span className="tabular-nums font-bold text-navy-200">
                  {evaluadasIds.size} / {candidatas.length} evaluadas
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-navy-800">
                <div
                  className="h-full rounded-full bg-gold-500 transition-all duration-500"
                  style={{ width: `${pctEvaluadas}%` }}
                />
              </div>
              <div className="mt-2 flex items-center gap-2 text-[11px]">
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-semibold text-emerald-400">
                  ✔ Evaluada — toca para corregir
                </span>
              </div>
            </div>

            {/* Cuadrícula de candidatas */}
            {candidatas.length === 0 ? (
              <p className="mt-4 text-center text-sm text-navy-500">Sin candidatas registradas.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {candidatas.map((c) => {
                  const evaluada = evaluadasIds.has(c.id)
                  return (
                    <button
                      key={c.id}
                      onClick={() => setCandidataSel(c)}
                      className={`group relative flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition ${
                        evaluada
                          ? 'border-emerald-500/30 bg-emerald-500/10 hover:border-emerald-500/50 hover:bg-emerald-500/15'
                          : 'border-white/10 bg-navy-800/50 hover:border-gold-500/40 hover:bg-navy-800'
                      }`}
                    >
                      {evaluada && (
                        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-navy-950">
                          ✓
                        </span>
                      )}
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-500/20 text-sm font-bold text-gold-400">
                        {iniciales(c.nombre)}
                      </span>
                      <span className="w-full truncate text-sm font-semibold text-white">
                        {c.nombre}
                      </span>
                      <span className="text-[11px] text-navy-400">
                        {c.grado} · Sección {c.seccion}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          evaluada
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-navy-600/40 text-navy-300'
                        }`}
                      >
                        {evaluada ? 'Evaluado · Corregir' : 'Evaluar'}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Banner de candidata */}
            <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-navy-900/70 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-500/20 text-sm font-bold text-gold-400">
                  {iniciales(candidataSel.nombre)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">{candidataSel.nombre}</p>
                  <p className="text-xs text-navy-400">
                    {candidataSel.grado} · Sección {candidataSel.seccion}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setCandidataSel(null)
                  setDetalles([])
                  setEnviado(false)
                }}
                className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-navy-300 transition hover:bg-navy-800 hover:text-white"
              >
                ← Cambiar
              </button>
            </div>

            {/* Rúbrica: criterios base (suman 100) */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {criterios
                .filter((cr) => !cr.es_desempate)
                .map((cr, i) => {
                  const det = detalles.find((d) => d.criterio_id === cr.id)
                  const puntaje = det?.puntaje ?? 0

                  return (
                    <ScoreSlider
                      key={cr.id}
                      index={i + 1}
                      label={cr.nombre}
                      value={puntaje}
                      max={cr.puntaje_maximo}
                      descripcion={cr.indicadores ?? undefined}
                      onChange={(v) => handleSliderChange(cr.id, v)}
                    />
                  )
                })}
            </div>

            {/* Desempate: se evalúa igual pero los puntos van aparte */}
            {criterios.some((cr) => cr.es_desempate) && (
              <div className="mt-5">
                <div className="mb-2 flex items-center gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-300">
                    Criterios de desempate
                  </p>
                  <span className="h-px flex-1 bg-gradient-to-r from-gold-500/40 to-transparent" />
                  <p className="text-[11px] text-navy-500">Solo rompen empates, no suman a la nota base</p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {criterios
                    .filter((cr) => cr.es_desempate)
                    .map((cr, i) => {
                      const det = detalles.find((d) => d.criterio_id === cr.id)
                      const puntaje = det?.puntaje ?? 0

                      return (
                        <ScoreSlider
                          key={cr.id}
                          index={i + 1}
                          label={cr.nombre}
                          value={puntaje}
                          max={cr.puntaje_maximo}
                          descripcion={cr.indicadores ?? undefined}
                          desempate
                          onChange={(v) => handleSliderChange(cr.id, v)}
                        />
                      )
                    })}
                </div>
              </div>
            )}

            {/* Total */}
            <div className="mt-4 rounded-2xl border border-white/10 bg-navy-900/70 p-5">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-navy-400">
                    Puntaje total
                  </p>
                  <p className="mt-1 text-sm text-navy-500">
                    {enviado ? 'Evaluación guardada — puedes corregir el puntaje' : 'Ajusta cada criterio con + / −'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-bold tabular-nums leading-none text-gold-400">
                    {total}
                    <span className="ml-1 text-base font-semibold text-navy-500">/ 100</span>
                  </p>
                  {totalDesempate > 0 && (
                    <p className="mt-1.5 text-xs font-bold text-gold-300">
                      +{totalDesempate} pts desempate
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-navy-800">
                <div
                  className="h-full rounded-full bg-linear-to-r from-gold-600 to-gold-400 transition-all duration-500"
                  style={{ width: `${pctTotal}%` }}
                />
              </div>
            </div>

            {error && (
              <p className="mt-3 rounded-lg bg-red-500/10 px-4 py-2 text-center text-sm text-red-400">
                {error}
              </p>
            )}
          </>
        )}
      </main>

      {/* Barra fija inferior (solo mientras se evalúa) */}
      {candidataSel && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-navy-950/95 px-4 py-3 backdrop-blur"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <div className="mx-auto flex max-w-5xl items-center gap-4">
            <div className="flex min-w-0 flex-1 items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums text-gold-400">{total}</span>
              <span className="text-sm text-navy-500">/ 100 pts</span>
              {totalDesempate > 0 && (
                <span className="rounded-full bg-gold-500/10 px-2 py-0.5 text-[11px] font-bold text-gold-300 shadow-[inset_0_0_0_1px_rgba(223,191,98,0.3)]">
                  +{totalDesempate} desempate
                </span>
              )}
            </div>
            <button
              onClick={handleGuardar}
              disabled={saving || enviado}
              className={`rounded-xl px-6 py-3 text-sm font-bold transition-all duration-300 ${
                enviado
                  ? 'cursor-default bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                  : 'bg-gold-500 text-navy-900 hover:bg-gold-400 active:scale-[0.98]'
              } disabled:opacity-70`}
            >
              {enviado ? '✓ Evaluación guardada' : saving ? 'Guardando…' : 'Guardar evaluación'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}