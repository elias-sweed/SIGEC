import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCertamen } from '../context/CertamenContext'
import { getSupabase } from '../lib/supabase'
import { marcarEnSesion, actualizarCandidataJurado } from '../services/jurado.service'
import { calcularTotales } from '../utils/scoring'
import { logConsulta, logFilas, logError } from '../utils/devlog'
import { leerSesionJurado, limpiarSesionJurado } from '../utils/session'
import ScoreSlider from '../components/event/ScoreSlider'
import { ordenarCandidatas } from '../components/public/CandidatasGrid'
import { ETAPAS } from '../constants/criteriosOficiales'
import type { Candidata, Criterio, Evento, Jurado } from '../types/database'

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

const GRADOS = ['1', '2', '3', '4', '5']
const SECCIONES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']

function numeroEtapa(etapa: string): string {
  const match = ETAPAS.findIndex((e) => e === etapa)
  return match >= 0 ? `Etapa ${match + 1}` : etapa
}

export default function JuradoEvaluacion() {
  const { candidatas, eventoCandidato: evento, estadoEvento } = useCertamen()
  const navigate = useNavigate()
  const sesion = leerSesionJurado()

  const [jurado, setJurado] = useState<Jurado | null>(null)
  const [eventos, setEventos] = useState<Evento[]>([])
  const [etapaSel, setEtapaSel] = useState<string>(ETAPAS[0])
  const [candidataSel, setCandidataSel] = useState<Candidata | null>(null)
  // Progreso por candidata: cuántos criterios de la etapa ya respondió este jurado.
  const [progreso, setProgreso] = useState<Record<string, number>>({})
  const [criterios, setCriterios] = useState<Criterio[]>([])
  const [detalles, setDetalles] = useState<DetalleState[]>([])
  const [enviado, setEnviado] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filtroGrado, setFiltroGrado] = useState('')
  const [filtroSeccion, setFiltroSeccion] = useState('')
  // Criterios ya respondidos: bloqueados para evitar errores al reanudar
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set())
  const [cargandoEtapa, setCargandoEtapa] = useState(true)

  // Candidatas ordenadas por grado (1→5) → sección → nombre, y filtradas
  const candidatasOrdenadas = useMemo(() => ordenarCandidatas(candidatas), [candidatas])
  const candidatasVisibles = useMemo(
    () =>
      candidatasOrdenadas.filter(
        (c) =>
          (!filtroGrado || c.grado === filtroGrado) &&
          (!filtroSeccion || c.seccion === filtroSeccion),
      ),
    [candidatasOrdenadas, filtroGrado, filtroSeccion],
  )

  // Evento de la etapa seleccionada (cada etapa tiene su propio evento de evaluación)
  const eventoEtapa = useMemo(
    () => eventos.find((e) => e.etapa === etapaSel) ?? null,
    [eventos, etapaSel],
  )
  const totalCriterios = criterios.length

  // Cargar jurado por sesión + lista de eventos (para mapear las 3 etapas)
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
      void marcarEnSesion((data as Jurado).id, true)

      const { data: eventosRaw } = await supabase.from('eventos').select('*').order('created_at')
      const lista = (eventosRaw ?? []) as Evento[]
      setEventos(lista)
      // La pestaña inicial es la etapa del evento activo (si es de las 3)
      const etapaInicial = lista.some((e) => e.etapa === evento?.etapa) ? evento!.etapa : ETAPAS[0]
      setEtapaSel(etapaInicial)
    })()
  }, [sesion, jurado, navigate, evento])

  // Al elegir etapa + candidata: cargar criterios de la etapa y la evaluación existente
  useEffect(() => {
    if (!jurado || !eventoEtapa) return
    setCargandoEtapa(true)

    ;(async () => {
      const supabase = getSupabase()
      logConsulta(`Jurado ${jurado.codigo}: criterios etapa=${etapaSel}`)
      const { data: criteriosData, error: criteriosError } = await supabase
        .from('criterios')
        .select('*')
        .eq('etapa', etapaSel)
        .order('orden')

      if (criteriosError) {
        logError('Jurado criterios', criteriosError.message)
        setCargandoEtapa(false)
        return
      }

      logFilas('criterios', criteriosData ?? [])
      const listaCriterios = (criteriosData ?? []) as Criterio[]
      setCriterios(listaCriterios)

      // Evaluaciones de este jurado en la etapa: conteo de criterios respondidos
      setProgreso({})
      const { data: evals } = await supabase
        .from('evaluaciones')
        .select('id, candidata_id')
        .eq('jurado_id', jurado.id)
        .eq('evento_id', eventoEtapa.id)

      if (evals && evals.length > 0) {
        const { data: detallesCuenta } = await supabase
          .from('evaluacion_detalles')
          .select('evaluacion_id, criterio_id')
          .in(
            'evaluacion_id',
            evals.map((e) => e.id as string),
          )

        const porEvaluacion: Record<string, Set<string>> = {}
        for (const d of detallesCuenta ?? []) {
          const id = d.evaluacion_id as string
          ;(porEvaluacion[id] ??= new Set()).add(d.criterio_id as string)
        }
        const mapa: Record<string, number> = {}
        for (const e of evals) {
          const id = e.id as string
          mapa[e.candidata_id as string] = porEvaluacion[id]?.size ?? 0
        }
        setProgreso(mapa)
      }

      if (candidataSel) {
        const { data: existente, error: existenteError } = await supabase
          .from('evaluaciones')
          .select('id')
          .eq('candidata_id', candidataSel.id)
          .eq('jurado_id', jurado.id)
          .eq('evento_id', eventoEtapa.id)
          .maybeSingle()

        if (existenteError) {
          logError('Jurado buscar evaluación', existenteError.message)
        } else if (existente) {
          setEnviado(true)
          const { data: detallesExistentes } = await supabase
            .from('evaluacion_detalles')
            .select('criterio_id, puntaje')
            .eq('evaluacion_id', existente.id)

          if (detallesExistentes) {
            setDetalles(detallesExistentes as DetalleState[])
            setLockedIds(new Set(detallesExistentes.map((d) => d.criterio_id as string)))
          } else {
            setLockedIds(new Set())
          }
        }
      }

      setCargandoEtapa(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jurado, etapaSel, eventoEtapa?.id])

  // Al cambiar de etapa: limpiar la candidata seleccionada
  useEffect(() => {
    setCandidataSel(null)
    setDetalles([])
    setEnviado(false)
    setLockedIds(new Set())
    setError(null)
  }, [etapaSel, eventoEtapa?.id])

  const salir = async () => {
    if (jurado) {
      await marcarEnSesion(jurado.id, false)
      await actualizarCandidataJurado(jurado.id, null)
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
    if (lockedIds.has(criterioId)) return
    const entero = Math.round(value)
    setDetalles((prev) => {
      const existente = prev.find((d) => d.criterio_id === criterioId)
      if (existente) {
        return prev.map((d) => (d.criterio_id === criterioId ? { ...d, puntaje: entero } : d))
      }
      return [...prev, { criterio_id: criterioId, puntaje: entero }]
    })
  }

  const handleGuardar = async () => {
    if (!jurado || !candidataSel || !eventoEtapa) return
    setSaving(true)
    setError(null)

    const supabase = getSupabase()

    // Solo se bloquean los guardados si la etapa ya quedó cerrada definitivamente.
    const { data: guardia } = await supabase
      .from('estado_evento')
      .select('estado')
      .eq('evento_id', eventoEtapa.id)
      .limit(1)
      .maybeSingle()
    if (guardia && (guardia.estado === 'publicado' || guardia.estado === 'resultados_listos')) {
      setError('La evaluación está cerrada. No se guardaron cambios.')
      setSaving(false)
      return
    }

    logConsulta('Jurado: upsert de evaluación (atómico)')
    const { data: nuevaEval, error: evalError } = await supabase
      .from('evaluaciones')
      .upsert(
        {
          evento_id: eventoEtapa.id,
          candidata_id: candidataSel.id,
          jurado_id: jurado.id,
          estado: 'completada',
        },
        { onConflict: 'evento_id,candidata_id,jurado_id' },
      )
      .select('id')
      .single()

    if (evalError || !nuevaEval) {
      logError('Jurado upsert evaluación', evalError?.message ?? 'No data')
      setError(evalError?.message ?? 'Error al guardar la evaluación')
      setSaving(false)
      return
    }
    const evaluacionId = nuevaEval.id

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

    setEnviado(true)
    setSaving(false)

    setLockedIds((prev) => {
      const nuevo = new Set(prev)
      detalles.forEach((d) => nuevo.add(d.criterio_id))
      return nuevo
    })

    // Actualiza el contador de la candidata con los criterios guardados
    setProgreso((prev) => ({
      ...prev,
      [candidataSel.id]: detalles.length,
    }))
  }

  if (!jurado) {
    return (
      <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-8 text-center">
        <p className="text-sm text-navy-400">Cargando sesión…</p>
      </div>
    )
  }

  const estadoJurado = estadoEvento?.estado ?? 'preparando'
  const bloqueado = estadoJurado === 'publicado' || estadoJurado === 'resultados_listos'
  const desempateIds = new Set(
    criterios.filter((c) => c.es_desempate).map((c) => c.id),
  )
  const { base: total, desempate: totalDesempate } = calcularTotales(detalles, desempateIds)

  const evaluadas = candidatas.filter((c) => totalCriterios > 0 && (progreso[c.id] ?? 0) >= totalCriterios)
  const pctEvaluadas = candidatas.length > 0 ? (evaluadas.length / candidatas.length) * 100 : 0
  const pctTotal = Math.min(100, total)

  const restantesNuevos = detalles.some((d) => !lockedIds.has(d.criterio_id))
  const todoBloqueado = totalCriterios > 0 && criterios.every((cr) => lockedIds.has(cr.id))

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
            <p className="text-center text-[10px] uppercase tracking-widest text-navy-500">Ronda</p>
            <p className="truncate text-xs font-semibold text-gold-400">{numeroEtapa(etapaSel)}</p>
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
        {/* Las 3 etapas: el jurado elige cuál evaluar (sin activación del admin) */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          {ETAPAS.map((e, i) => {
            const tieneEvento = eventos.some((ev) => ev.etapa === e)
            const activa = etapaSel === e
            return (
              <button
                key={e}
                onClick={() => {
                  if (tieneEvento) setEtapaSel(e)
                }}
                disabled={!tieneEvento}
                className={`rounded-2xl border px-3 py-3 text-left transition ${
                  activa
                    ? 'border-gold-500/60 bg-gold-500/15 ring-2 ring-gold-400/40'
                    : tieneEvento
                      ? 'border-white/10 bg-navy-900/60 hover:border-gold-500/40'
                      : 'cursor-not-allowed border-white/5 bg-navy-900/30 opacity-50'
                }`}
              >
                <p
                  className={`text-[10px] font-black uppercase tracking-widest ${
                    activa ? 'text-gold-300' : 'text-navy-400'
                  }`}
                >
                  Etapa {i + 1}
                </p>
                <p className="mt-0.5 text-xs font-bold leading-tight text-white">
                  {i === 0 ? 'Coreografía' : i === 1 ? 'Talento' : 'Gala y preguntas'}
                </p>
                <p className="mt-0.5 text-[10px] text-navy-400">
                  {tieneEvento ? (activa ? 'Evaluando…' : 'Toca para evaluar') : 'Créala en el panel'}
                </p>
              </button>
            )
          })}
        </div>

        {!eventoEtapa ? (
          <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-8 text-center">
            <p className="text-sm text-navy-300">
              La etapa <span className="font-bold text-gold-400">{etapaSel}</span> aún no tiene evento
              creado.
            </p>
            <p className="mt-2 text-xs text-navy-500">
              Créala desde Panel → Evento seleccionando la etapa correspondiente, y los jurados la verán
              aquí automáticamente.
            </p>
          </div>
        ) : bloqueado ? (
          <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-8 text-center">
            <p className="text-lg font-semibold text-navy-300">
              Resultados <span className="text-purple-400">publicados</span>
            </p>
            <p className="mt-3 text-sm text-navy-500">
              El certamen concluyó y los resultados fueron publicados. No se pueden modificar puntajes.
            </p>
          </div>
        ) : !candidataSel ? (
          <>
            {/* Progreso general de la etapa */}
            <div className="mb-4 rounded-2xl border border-white/10 bg-navy-900/70 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold uppercase tracking-widest text-gold-400">
                  {numeroEtapa(etapaSel)} · selecciona la candidata a evaluar
                </span>
                <span className="tabular-nums font-bold text-navy-200">
                  {evaluadas.length} / {candidatas.length} completas
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-navy-800">
                <div
                  className="h-full rounded-full bg-gold-500 transition-all duration-500"
                  style={{ width: `${pctEvaluadas}%` }}
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-semibold text-emerald-400">
                  ✔ Completa — toca para corregir
                </span>
                <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 font-semibold text-amber-300">
                  En proceso — faltan criterios
                </span>
              </div>
            </div>

            {/* Filtros por grado y sección */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <select
                value={filtroGrado}
                onChange={(e) => setFiltroGrado(e.target.value)}
                className="input-panel w-auto"
                title="Filtrar por grado"
              >
                <option value="">Todos los grados</option>
                {GRADOS.map((g) => (
                  <option key={g} value={g}>
                    {g}° grado
                  </option>
                ))}
              </select>
              <select
                value={filtroSeccion}
                onChange={(e) => setFiltroSeccion(e.target.value)}
                className="input-panel w-auto"
                title="Filtrar por sección"
              >
                <option value="">Todas las secciones</option>
                {SECCIONES.map((s) => (
                  <option key={s} value={s}>
                    Sección {s}
                  </option>
                ))}
              </select>
              {(filtroGrado || filtroSeccion) && (
                <button
                  onClick={() => {
                    setFiltroGrado('')
                    setFiltroSeccion('')
                  }}
                  className="btn-ghost"
                >
                  Limpiar filtros
                </button>
              )}
              <span className="text-[11px] text-navy-400">
                {candidatasVisibles.length} de {candidatas.length} candidatas
              </span>
            </div>

            {cargandoEtapa ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-28 animate-pulse rounded-2xl bg-navy-800/60" />
                ))}
              </div>
            ) : candidatas.length === 0 ? (
              <p className="mt-4 text-center text-sm text-navy-500">Sin candidatas registradas.</p>
            ) : candidatasVisibles.length === 0 ? (
              <p className="mt-4 text-center text-sm text-navy-500">
                Ninguna candidata coincide con los filtros.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {candidatasVisibles.map((c) => {
                  const hechos = progreso[c.id] ?? 0
                  const completada = totalCriterios > 0 && hechos >= totalCriterios
                  const pendientes = totalCriterios - hechos
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        setCandidataSel(c)
                        void actualizarCandidataJurado(jurado.id, c.id)
                      }}
                      className={`group relative flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition ${
                        completada
                          ? 'border-emerald-500/30 bg-emerald-500/10 hover:border-emerald-500/50 hover:bg-emerald-500/15'
                          : hechos > 0
                            ? 'border-amber-500/30 bg-amber-500/10 hover:border-amber-500/50 hover:bg-amber-500/15'
                            : 'border-white/10 bg-navy-800/50 hover:border-gold-500/40 hover:bg-navy-800'
                      }`}
                    >
                      {completada && (
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
                          completada
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : hechos > 0
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-navy-600/40 text-navy-300'
                        }`}
                      >
                        {completada
                          ? 'Evaluada · Corregir'
                          : hechos > 0
                            ? `${pendientes} criterios por evaluar`
                            : totalCriterios > 0
                              ? `Evaluar · ${totalCriterios} criterios`
                              : 'Evaluar'}
                      </span>
                      {hechos > 0 && !completada && (
                        <span className="mt-1 h-1 w-full overflow-hidden rounded-full bg-navy-800">
                          <span
                            className="block h-full rounded-full bg-amber-400"
                            style={{ width: `${(hechos / totalCriterios) * 100}%` }}
                          />
                        </span>
                      )}
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
                    {candidataSel.grado} · Sección {candidataSel.seccion} · {numeroEtapa(etapaSel)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  void actualizarCandidataJurado(jurado.id, null)
                  setCandidataSel(null)
                  setDetalles([])
                  setEnviado(false)
                  setLockedIds(new Set())
                }}
                className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-navy-300 transition hover:bg-navy-800 hover:text-white"
              >
                ← Cambiar
              </button>
            </div>

            {cargandoEtapa ? (
              <div className="h-24 animate-pulse rounded-2xl bg-navy-800/60" />
            ) : totalCriterios === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-navy-900/70 p-8 text-center text-sm text-navy-400">
                Esta etapa aún no tiene criterios. Cárgalos desde Panel → Criterios.
              </p>
            ) : (
              <>
                {lockedIds.size > 0 && !todoBloqueado && (
                  <p className="mb-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-300">
                    Los criterios con «✓ Evaluado» ya fueron respondidos y están bloqueados. Completa los
                    restantes y pulsa «Guardar criterios restantes».
                  </p>
                )}
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
                          bloqueado={lockedIds.has(cr.id)}
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
                      <span className="h-px flex-1 bg-linear-to-r from-gold-500/40 to-transparent" />
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
                              bloqueado={lockedIds.has(cr.id)}
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
                        <span className="ml-1 text-base font-semibold text-navy-500">
                          / {criterios.filter((cr) => !cr.es_desempate).reduce((s, c) => s + c.puntaje_maximo, 0)}
                        </span>
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
          </>
        )}
      </main>

      {/* Barra fija inferior mientras hay una candidata en evaluación */}
      {!bloqueado && candidataSel && eventoEtapa && totalCriterios > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-navy-950/95 px-4 py-3 backdrop-blur"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <div className="mx-auto flex max-w-5xl items-center gap-4">
            <div className="flex min-w-0 flex-1 items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums text-gold-400">{total}</span>
              <span className="text-sm text-navy-500">
                / {criterios.filter((cr) => !cr.es_desempate).reduce((s, c) => s + c.puntaje_maximo, 0)} pts
              </span>
              {totalDesempate > 0 && (
                <span className="rounded-full bg-gold-500/10 px-2 py-0.5 text-[11px] font-bold text-gold-300 shadow-[inset_0_0_0_1px_rgba(223,191,98,0.3)]">
                  +{totalDesempate} desempate
                </span>
              )}
            </div>
            <button
              onClick={handleGuardar}
              disabled={saving || todoBloqueado}
              className={`rounded-xl px-6 py-3 text-sm font-bold transition-all duration-300 ${
                todoBloqueado
                  ? 'cursor-default bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                  : 'bg-gold-500 text-navy-900 hover:bg-gold-400 active:scale-[0.98]'
              } disabled:opacity-70`}
            >
              {saving
                ? 'Guardando…'
                : todoBloqueado
                  ? '✓ Evaluación completada'
                  : restantesNuevos
                    ? enviado
                      ? 'Guardar criterios restantes'
                      : 'Guardar evaluación'
                    : enviado
                      ? '✓ Evaluación guardada'
                      : 'Guardar evaluación'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}