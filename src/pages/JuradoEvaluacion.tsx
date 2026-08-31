import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCertamen } from '../context/CertamenContext'
import { getSupabase } from '../lib/supabase'
import { marcarEnSesion } from '../services/jurado.service'
import { calcularTotal } from '../utils/scoring'
import { logConsulta, logFilas, logError } from '../utils/devlog'
import { leerSesionJurado, limpiarSesionJurado } from '../utils/session'
import ScoreSlider from '../components/event/ScoreSlider'
import { EVENT_STATE_LABELS, type EventState } from '../constants/eventStates'
import type { Criterio, Jurado } from '../types/database'

interface DetalleState {
  criterio_id: string
  puntaje: number
}

export default function JuradoEvaluacion() {
  const { candidataActual, eventoCandidato, estadoEvento } = useCertamen()
  const navigate = useNavigate()
  const sesion = leerSesionJurado()

  const [jurado, setJurado] = useState<Jurado | null>(null)
  const [criterios, setCriterios] = useState<Criterio[]>([])
  const [detalles, setDetalles] = useState<DetalleState[]>([])
  const [enviado, setEnviado] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    })()
  }, [sesion, jurado, navigate])

  const juradoId = jurado?.id

  useEffect(() => {
    if (!juradoId || !candidataActual || !eventoCandidato || !estadoEvento) return
    if (estadoEvento.estado !== 'evaluando') return

    ;(async () => {
      const supabase = getSupabase()
      logConsulta(`Jurado ${jurado?.codigo}: criterios etapa=${eventoCandidato.etapa}`)
      const { data: criteriosData, error: criteriosError } = await supabase
        .from('criterios')
        .select('*')
        .eq('etapa', eventoCandidato.etapa)
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
        .eq('evento_id', eventoCandidato.id)
        .eq('candidata_id', candidataActual.id)
        .eq('jurado_id', juradoId)
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
  }, [juradoId, jurado?.codigo, candidataActual, eventoCandidato, estadoEvento])

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
    if (!juradoId || !candidataActual || !eventoCandidato) return
    setSaving(true)
    setError(null)

    const supabase = getSupabase()

    logConsulta('Jurado: buscar evaluación existente')
    const { data: existente } = await supabase
      .from('evaluaciones')
      .select('id')
      .eq('evento_id', eventoCandidato.id)
      .eq('candidata_id', candidataActual.id)
      .eq('jurado_id', juradoId)
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
          evento_id: eventoCandidato.id,
          candidata_id: candidataActual.id,
          jurado_id: juradoId,
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
  }

  if (!jurado) {
    return (
      <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-8 text-center">
        <p className="text-sm text-navy-400">Cargando sesión…</p>
      </div>
    )
  }

  const evaluando = estadoEvento?.estado === 'evaluando'
  const total = calcularTotal(detalles)

  return (
    <div className="space-y-4">
      {/* Encabezado de sesión */}
      <header className="rounded-2xl border border-white/10 bg-navy-900/70 p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-500 text-lg">
              🏆
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{jurado.nombre}</p>
              <p className="font-mono text-xs font-bold text-gold-400">{jurado.codigo}</p>
            </div>
          </div>
          <button
            onClick={salir}
            className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-navy-200 transition hover:bg-navy-800 hover:text-white"
          >
            Salir
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-4 text-sm">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-navy-500">Candidata activa</p>
            <p className="font-semibold text-white">
              {candidataActual ? `${candidataActual.nombre} · ${candidataActual.grado} · ${candidataActual.seccion}` : '—'}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-widest text-navy-500">Etapa</p>
            <p className="font-semibold text-gold-400">{eventoCandidato?.etapa ?? '—'}</p>
          </div>
        </div>
      </header>

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
            {eventoCandidato && `Etapa: ${eventoCandidato.etapa}`}
          </p>
        </div>
      ) : (
        <>
          {/* Candidata */}
          <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-6 text-center transition-all duration-300">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
              Evaluando
            </p>
            <h2 className="mt-1 text-3xl font-bold text-white sm:text-4xl">
              {candidataActual?.nombre ?? '—'}
            </h2>
            <p className="mt-1 text-sm text-navy-300">
              {candidataActual ? `${candidataActual.grado} · Sección ${candidataActual.seccion}` : ''}
            </p>
          </div>

          {/* Sliders */}
          <div className="space-y-3">
            {criterios.map((cr) => {
              const det = detalles.find((d) => d.criterio_id === cr.id)
              const puntaje = det?.puntaje ?? 0

              return (
                <ScoreSlider
                  key={cr.id}
                  label={cr.nombre}
                  value={puntaje}
                  max={cr.puntaje_maximo}
                  onChange={(v) => handleSliderChange(cr.id, v)}
                />
              )
            })}
          </div>

          {/* Total */}
          <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-navy-400">Total</p>
            <p className="mt-2 text-5xl font-bold text-gold-400">{total}</p>
            <p className="mt-1 text-sm text-navy-500">puntos</p>
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-4 py-2 text-center text-sm text-red-400">
              {error}
            </p>
          )}

          {/* Botón Enviar */}
          <button
            onClick={handleGuardar}
            disabled={saving || enviado}
            className={`w-full rounded-2xl py-4 text-lg font-bold transition-all duration-300 ${
              enviado
                ? 'cursor-default bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                : 'bg-gold-500 text-navy-900 hover:bg-gold-400 active:scale-[0.98]'
            } disabled:opacity-70`}
          >
            {enviado
              ? '✓ Evaluación enviada'
              : saving
                ? 'Guardando…'
                : 'Guardar evaluación'}
          </button>
        </>
      )}
    </div>
  )
}