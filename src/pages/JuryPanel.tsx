import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { useCertamen } from '../context/CertamenContext'
import { getSupabase } from '../lib/supabase'
import { calcularTotal } from '../utils/scoring'
import { logConsulta, logFilas, logError } from '../utils/devlog'
import ScoreSlider from '../components/event/ScoreSlider'
import { EVENT_STATE_LABELS, type EventState } from '../constants/eventStates'
import type { Criterio, Jurado } from '../types/database'

interface DetalleState {
  criterio_id: string
  puntaje: number
}

export default function JuryPanel() {
  const { candidataActual, eventoCandidato, estadoEvento } = useCertamen()

  const [jurado, setJurado] = useState<Jurado | null>(null)
  const [codigo, setCodigo] = useState('')
  const [verificando, setVerificando] = useState(false)
  const [errorCodigo, setErrorCodigo] = useState<string | null>(null)

  const [criterios, setCriterios] = useState<Criterio[]>([])
  const [detalles, setDetalles] = useState<DetalleState[]>([])
  const [enviado, setEnviado] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const verificarCodigo = async () => {
    const codigoLimpio = codigo.trim().toUpperCase()
    if (!codigoLimpio) {
      setErrorCodigo('Ingresa el código del jurado')
      return
    }
    setVerificando(true)
    setErrorCodigo(null)

    const supabase = getSupabase()
    logConsulta(`Jurado: validar código ${codigoLimpio}`)
    const { data, error } = await supabase
      .from('jurados')
      .select('*')
      .eq('codigo', codigoLimpio)
      .maybeSingle()

    if (error) {
      logError('validar código', error.message)
      setErrorCodigo(error.message)
    } else if (!data) {
      setErrorCodigo(`El código "${codigoLimpio}" no es válido. Verifica con el administrador.`)
    } else {
      setJurado(data as Jurado)
      setCodigo('')
    }
    setVerificando(false)
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

  /* ─── 1) Login con código ─────────────────────────────────────── */

  if (!jurado) {
    return (
      <>
        <PageHeader
          eyebrow="Panel de jurado"
          title="Panel de Evaluación"
          description="Ingresa el código que te entregó el administrador."
        />
        <div className="mx-auto mt-10 max-w-sm rounded-2xl border border-white/10 bg-navy-900/70 p-8">
          <label className="block text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">
            Código del jurado
          </label>
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && verificarCodigo()}
            placeholder="JUR-001"
            className="mt-3 w-full rounded-xl border border-white/10 bg-navy-800 px-4 py-3 text-center font-mono text-lg font-bold uppercase tracking-widest text-white placeholder:text-navy-500 focus:border-gold-500/50 focus:outline-none"
          />
          {errorCodigo && (
            <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-center text-sm text-red-400">
              {errorCodigo}
            </p>
          )}
          <button
            onClick={verificarCodigo}
            disabled={verificando}
            className="mt-4 w-full rounded-xl bg-gold-500 py-3 text-sm font-bold text-navy-900 transition hover:bg-gold-400 disabled:opacity-50"
          >
            {verificando ? 'Validando…' : 'Ingresar'}
          </button>
          <p className="mt-4 text-center text-xs text-navy-500">
            El administrador te entrega tu código (JUR-001, JUR-002…) al iniciar el certamen.
          </p>
        </div>
      </>
    )
  }

  /* ─── 2) Esperando evaluación ───────────────────────────────────── */

  if (!estadoEvento || estadoEvento.estado !== 'evaluando') {
    return (
      <>
        <PageHeader
          eyebrow="Panel de jurado"
          title="Panel de Evaluación"
          description="La evaluación no está activa en este momento."
        />
        <div className="mx-auto mt-8 max-w-md rounded-2xl border border-white/10 bg-navy-900/70 p-8 text-center">
          <p className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-400">
            ✓ Sesión iniciada: {jurado.nombre} · {jurado.codigo}
          </p>
          <p className="mt-4 text-lg font-semibold text-navy-300">
            Estado actual:{' '}
            <span className="text-gold-400">
              {estadoEvento ? (EVENT_STATE_LABELS[estadoEvento.estado as EventState] ?? estadoEvento.estado) : 'Preparando'}
            </span>
          </p>
          <p className="mt-3 text-sm text-navy-500">
            El administrador debe iniciar la evaluación desde el{' '}
            <strong className="text-navy-200">Centro de Control</strong>. Cuando lo haga, esta
            pantalla se habilitará automáticamente.
          </p>
        </div>
      </>
    )
  }

  /* ─── 3) Evaluación ─────────────────────────────────────────────── */

  const total = calcularTotal(detalles)

  return (
    <>
      <PageHeader
        eyebrow="Panel de jurado"
        title="Panel de Evaluación"
        description="Evalúa a la candidata activa moviendo los cursores."
      />

      <div className="mx-auto mt-6 max-w-lg space-y-6">
        {/* Sesión */}
        <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm">
          <span className="text-emerald-300">
            ✓ Evaluando como <strong className="text-white">{jurado.nombre}</strong>{' '}
            <span className="font-mono text-emerald-400">{jurado.codigo}</span>
          </span>
          <button
            onClick={() => {
              setJurado(null)
              setDetalles([])
              setEnviado(false)
            }}
            className="rounded bg-navy-800 px-2 py-1 text-xs font-semibold text-navy-200 transition hover:bg-navy-700"
          >
            Salir
          </button>
        </div>

        {/* Header grande de candidata */}
        <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-8 text-center transition-all duration-300">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
            Evaluando
          </p>
          <h2 className="mt-2 text-4xl font-bold text-white sm:text-5xl">
            {candidataActual?.nombre ?? '—'}
          </h2>
          <p className="mt-2 text-lg text-navy-300">
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

        {/* Error */}
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
      </div>
    </>
  )
}