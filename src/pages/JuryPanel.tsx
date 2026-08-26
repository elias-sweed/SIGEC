import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { useCertamen } from '../context/CertamenContext'
import { getSupabase } from '../lib/supabase'
import { obtenerCriteriosPorEtapa } from '../services/criteria.service'
import {
  crearEvaluacion,
  guardarDetalle,
  obtenerEvaluacionCompleta,
} from '../services/evaluation.service'
import type { Criterio, Jurado } from '../types/database'
import { calcularTotal, validarPuntaje } from '../utils/scoring'

interface Mensaje {
  tipo: 'exito' | 'error'
  texto: string
}

export default function JuryPanel() {
  const { eventoCandidato, candidataActual } = useCertamen()
  const [jurados, setJurados] = useState<Jurado[]>([])
  const [juradoId, setJuradoId] = useState('')
  const [criterios, setCriterios] = useState<Criterio[]>([])
  const [valores, setValores] = useState<Record<string, number>>({})
  const [mensaje, setMensaje] = useState<Mensaje | null>(null)
  const [cargando, setCargando] = useState(false)
  const [precargado, setPrecargado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!eventoCandidato || !candidataActual) return

    async function cargarJurados() {
      try {
        const supabase = getSupabase()
        const { data, error: errJurados } = await supabase.from('jurados').select('*').order('codigo')
        if (errJurados) throw errJurados
        setJurados((data ?? []) as Jurado[])
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo conectar con Supabase. Verifica tu archivo .env.',
        )
      }
    }

    cargarJurados()
  }, [eventoCandidato, candidataActual])

  useEffect(() => {
    if (!eventoCandidato) {
      setCriterios([])
      return
    }

    setCriterios([])
    setValores({})
    setMensaje(null)

    obtenerCriteriosPorEtapa(eventoCandidato.etapa)
      .then(setCriterios)
      .catch(() => {
        setMensaje({ tipo: 'error', texto: 'No se pudieron cargar los criterios de la etapa.' })
      })
  }, [eventoCandidato])

  useEffect(() => {
    if (!eventoCandidato || !candidataActual || !juradoId) {
      setValores({})
      setPrecargado(false)
      return
    }

    let cancelada = false

    async function precargar() {
      try {
        const supabase = getSupabase()
        const { data: existente } = await supabase
          .from('evaluaciones')
          .select('id')
          .match({
            evento_id: eventoCandidato!.id,
            candidata_id: candidataActual!.id,
            jurado_id: juradoId,
          })
          .maybeSingle()

        if (!existente || cancelada) {
          setValores({})
          setPrecargado(false)
          return
        }

        const completa = await obtenerEvaluacionCompleta(existente.id as string)
        if (cancelada) return

        const previos: Record<string, number> = {}
        for (const detalle of completa.evaluacion_detalles) {
          previos[detalle.criterio_id] = detalle.puntaje
        }
        setValores(previos)
        setPrecargado(true)
      } catch {
        setValores({})
        setPrecargado(false)
      }
    }

    precargar()
    return () => {
      cancelada = true
    }
  }, [eventoCandidato, candidataActual, juradoId])

  async function guardarEvaluacion() {
    if (!eventoCandidato || !candidataActual || !juradoId) return

    setCargando(true)
    setMensaje(null)

    try {
      for (const criterio of criterios) {
        const puntaje = valores[criterio.id] ?? 0
        if (!validarPuntaje(puntaje, criterio.puntaje_maximo)) {
          setMensaje({
            tipo: 'error',
            texto: `El puntaje de "${criterio.nombre}" debe estar entre 0 y ${criterio.puntaje_maximo}.`,
          })
          return
        }
      }

      const evaluacion = await crearEvaluacion({
        evento_id: eventoCandidato.id,
        candidata_id: candidataActual.id,
        jurado_id: juradoId,
      })

      for (const criterio of criterios) {
        await guardarDetalle({
          evaluacion_id: evaluacion.id,
          criterio_id: criterio.id,
          puntaje: valores[criterio.id] ?? 0,
        })
      }

      setPrecargado(true)
      setMensaje({ tipo: 'exito', texto: 'Evaluación guardada correctamente.' })
    } catch (err) {
      setMensaje({
        tipo: 'error',
        texto: err instanceof Error ? err.message : 'No se pudo guardar la evaluación.',
      })
    } finally {
      setCargando(false)
    }
  }

  const total = calcularTotal(
    criterios.map((criterio) => ({ puntaje: valores[criterio.id] ?? 0 })),
  )
  const sinSeleccion = !eventoCandidato || !candidataActual

  return (
    <>
      <PageHeader
        eyebrow="Evaluación"
        title="Panel del Jurado"
        description="Evalúa a la candidata seleccionada por el Panel Maestro. Los criterios se cargan automáticamente según la etapa del evento."
      />

      {sinSeleccion && (
        <section className="mx-auto mt-10 max-w-xl rounded-xl border border-dashed border-gold-500/40 bg-navy-900/50 px-6 py-8 text-center">
          <p className="text-sm leading-relaxed text-navy-200">
            Aún no hay candidata activa. Abre el Panel Maestro y selecciona una para comenzar su
            evaluación.
          </p>
          <Link to="/maestro" className="btn-primary mt-5 inline-flex">
            Ir al Panel Maestro
          </Link>
        </section>
      )}

      {error && (
        <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-red-400/30 bg-red-400/10 px-5 py-3 text-center text-sm text-red-200">
          {error}
        </div>
      )}

      {!sinSeleccion && (
        <section className="mx-auto mt-8 max-w-2xl space-y-6">
          <div className="rounded-xl border border-white/10 bg-navy-900/70 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">
                  Candidata a evaluar
                </p>
                <h2 className="mt-1 text-xl font-bold text-white">{candidataActual!.nombre}</h2>
                <p className="text-sm text-navy-300">
                  {candidataActual!.grado} · Sección {candidataActual!.seccion}
                </p>
              </div>
              <span className="rounded-full bg-gold-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gold-300">
                Etapa: {eventoCandidato!.etapa}
              </span>
            </div>
          </div>

          <div>
            <label htmlFor="jurado" className="block text-sm font-medium text-navy-200">
              Jurado
            </label>
            <select
              id="jurado"
              value={juradoId}
              onChange={(e) => {
                setJuradoId(e.target.value)
                setMensaje(null)
                setPrecargado(false)
              }}
              className="mt-2 w-full rounded-lg border border-white/10 bg-navy-800 px-4 py-2.5 text-sm text-white focus:border-gold-500 focus:outline-none"
            >
              <option value="">Selecciona tu nombre…</option>
              {jurados.map((jurado) => (
                <option key={jurado.id} value={jurado.id}>
                  {jurado.nombre} ({jurado.codigo})
                </option>
              ))}
            </select>
          </div>

          {criterios.length === 0 && !error && (
            <p className="rounded-xl border border-dashed border-navy-600 px-4 py-3 text-center text-sm text-navy-300">
              Cargando criterios…
            </p>
          )}

          {criterios.length > 0 && (
            <div className="space-y-5 rounded-xl border border-white/10 bg-navy-900/70 p-6">
              {precargado && (
                <div className="rounded-lg bg-emerald-500/10 px-3 py-2 text-center text-xs font-semibold text-emerald-300">
                  Evaluación guardada · Valores precargados
                </div>
              )}

              {criterios.map((criterio) => {
                const puntaje = valores[criterio.id] ?? 0
                return (
                  <div key={criterio.id}>
                    <div className="flex items-center justify-between gap-4">
                      <label htmlFor={`criterio-${criterio.id}`} className="font-medium text-white">
                        {criterio.nombre}
                      </label>
                      <span className="rounded-md bg-gold-500/15 px-2.5 py-1 text-sm font-semibold text-gold-300">
                        {puntaje} / {criterio.puntaje_maximo}
                      </span>
                    </div>
                    <input
                      id={`criterio-${criterio.id}`}
                      type="range"
                      min={0}
                      max={criterio.puntaje_maximo}
                      step={0.5}
                      value={puntaje}
                      onChange={(e) =>
                        setValores((previos) => ({
                          ...previos,
                          [criterio.id]: Number(e.target.value),
                        }))
                      }
                      className="mt-3 w-full accent-gold-500"
                    />
                  </div>
                )
              })}

              <div className="flex items-center justify-between border-t border-white/10 pt-4">
                <span className="text-sm uppercase tracking-wide text-navy-200">Total</span>
                <span className="text-lg font-bold text-gold-300">{total}</span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={guardarEvaluacion}
            disabled={!juradoId || cargando || criterios.length === 0}
            className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cargando ? (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Guardando…
              </span>
            ) : (
              'Guardar evaluación'
            )}
          </button>

          {mensaje && (
            <p
              className={`rounded-xl px-4 py-3 text-center text-sm ${
                mensaje.tipo === 'exito'
                  ? 'border border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                  : 'border border-red-400/30 bg-red-400/10 text-red-200'
              }`}
            >
              {mensaje.texto}
            </p>
          )}
        </section>
      )}
    </>
  )
}
