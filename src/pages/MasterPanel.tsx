import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { useCertamen } from '../context/CertamenContext'
import { getSupabase } from '../lib/supabase'
import { resetCertamen } from '../services/reset.service'
import { urlActivacion, urlQR } from '../services/jurado.service'
import { imprimirTarjetasAcceso } from '../utils/impresion'
import { CRITERIOS_OFICIALES, ETAPAS } from '../constants/criteriosOficiales'
import { EVENT_STATE_LABELS } from '../constants/eventStates'
import { logConsulta, logFilas, logError } from '../utils/devlog'
import type { Candidata, Criterio, Evaluacion, EvaluacionDetalle, Evento, Jurado } from '../types/database'

interface ItemChecklist {
  clave: string
  label: string
  ok: boolean
}

export default function MasterPanel() {
  const { estadoEvento, candidataActual, cargarEstado } = useCertamen()

  const [evento, setEvento] = useState<Evento | null>(null)
  const [candidatas, setCandidatas] = useState<Candidata[]>([])
  const [jurados, setJurados] = useState<Jurado[]>([])
  const [criterios, setCriterios] = useState<Criterio[]>([])
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([])
  const [detalles, setDetalles] = useState<EvaluacionDetalle[]>([])

  const [error, setError] = useState<string | null>(null)
  const [iniciando, setIniciando] = useState(false)
  const [reiniciando, setReiniciando] = useState(false)
  const cargarDatos = async () => {
    const supabase = getSupabase()

    const [ev, ca, ju, cr, evals, dets] = await Promise.all([
      supabase.from('eventos').select('*').order('created_at').limit(1).maybeSingle(),
      supabase.from('candidatas').select('*').order('nombre'),
      supabase.from('jurados').select('*').order('codigo'),
      supabase.from('criterios').select('*').order('orden'),
      supabase.from('evaluaciones').select('*'),
      supabase.from('evaluacion_detalles').select('evaluacion_id, puntaje'),
    ])

    if (ev.error) logError('eventos', ev.error.message)
    if (cr.error) logError('criterios', cr.error.message)

    setEvento((ev.data as Evento | null) ?? null)
    setCandidatas((ca.data ?? []) as Candidata[])
    setJurados((ju.data ?? []) as Jurado[])
    setCriterios((cr.data ?? []) as Criterio[])
    setEvaluaciones((evals.data ?? []) as Evaluacion[])
    setDetalles((dets.data ?? []) as EvaluacionDetalle[])

    logFilas('asistente: candidatas', ca.data ?? [])
    logFilas('asistente: jurados', ju.data ?? [])
    logFilas('asistente: criterios', cr.data ?? [])
    logFilas('asistente: evaluaciones', evals.data ?? [])
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  const etapa = evento?.etapa ?? ''
  const criteriosEtapa = criterios.filter((c) => c.etapa === etapa)

  const checklist: ItemChecklist[] = [
    { clave: 'evento', label: 'Evento creado', ok: !!evento },
    { clave: 'candidatas', label: 'Candidatas registradas', ok: candidatas.length > 0 },
    { clave: 'jurados', label: 'Jurados registrados', ok: jurados.length > 0 },
    { clave: 'criterios', label: 'Criterios oficiales cargados', ok: criteriosEtapa.length > 0 },
  ]
  const completo = checklist.every((i) => i.ok)
  const evaluando = estadoEvento?.estado === 'evaluando'

  /* ─── Acciones ─────────────────────────────────────────────────── */

  const recargar = async () => {
    await cargarDatos()
    await cargarEstado()
  }

  const iniciarEvaluacion = async () => {
    if (!evento || candidatas.length === 0) return
    setIniciando(true)
    setError(null)
    const supabase = getSupabase()

    const candidataInicial = candidatas[0]

    logConsulta('Asistente: marcando evento como evaluando')
    const { error: errEvento } = await supabase
      .from('eventos')
      .update({ estado: 'evaluando' })
      .eq('id', evento.id)
    if (errEvento) {
      logError('iniciar evento', errEvento.message)
      setError(errEvento.message)
      setIniciando(false)
      return
    }

    if (estadoEvento) {
      logConsulta('Asistente: actualizando estado_evento a evaluando')
      const { error } = await supabase
        .from('estado_evento')
        .update({
          candidata_actual_id: candidataInicial.id,
          estado: 'evaluando',
          updated_at: new Date().toISOString(),
        })
        .eq('evento_id', evento.id)
      if (error) {
        logError('iniciar estado_evento', error.message)
        setError(error.message)
        setIniciando(false)
        return
      }
    } else {
      logConsulta('Asistente: creando estado_evento (evaluando)')
      const { error } = await supabase.from('estado_evento').insert({
        evento_id: evento.id,
        candidata_actual_id: candidataInicial.id,
        estado: 'evaluando',
      })
      if (error) {
        logError('crear estado_evento', error.message)
        setError(error.message)
        setIniciando(false)
        return
      }
    }

    await recargar()
    setIniciando(false)
  }

  const reiniciarCertamen = async () => {
    if (!window.confirm('¿Seguro que quieres ELIMINAR todos los datos del certamen? Esta acción no se puede deshacer.')) {
      return
    }
    setReiniciando(true)
    setError(null)
    try {
      await resetCertamen()
      await recargar()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
    setReiniciando(false)
  }

  return (
    <>
      <PageHeader
        eyebrow="Configuración"
        title="Asistente de Certamen"
        description="Prepara un certamen completo desde cero: evento, jurados, candidatas e inicio de la evaluación."
      />

      <div className="mx-auto max-w-3xl space-y-6">
        {/* Banner de evaluación en curso */}
        {evaluando && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6 transition-all duration-500">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-400">
              Evaluación en curso
            </p>
            <p className="mt-2 text-lg font-bold text-white">
              {evento?.nombre ?? 'Certamen'}
            </p>
            <p className="mt-1 text-sm text-navy-200">
              Candidata activa: <strong className="text-white">{candidataActual?.nombre ?? '—'}</strong>
            </p>
            <Link
              to="/jurado"
              className="mt-4 inline-block rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-navy-900 transition hover:bg-gold-400"
            >
              Abrir acceso del jurado →
            </Link>
          </div>
        )}

        {error && (
          <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
        )}

        {/* Checklist + Iniciar */}
        <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-6">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
              Checklist de configuración
            </p>
            <button
              onClick={reiniciarCertamen}
              disabled={reiniciando}
              className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
            >
              {reiniciando ? 'Reiniciando…' : 'Reiniciar Certamen'}
            </button>
          </div>

          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {checklist.map((item) => (
              <li
                key={item.clave}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-300 ${
                  item.ok ? 'bg-emerald-500/10 text-emerald-300' : 'bg-navy-800/60 text-navy-300'
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                    item.ok ? 'bg-emerald-500 text-navy-950' : 'border border-navy-600 text-transparent'
                  }`}
                >
                  ✔
                </span>
                {item.label}
                <span className="ml-auto text-xs uppercase opacity-70">
                  {item.ok ? 'Listo' : 'Pendiente'}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-6 border-t border-white/5 pt-5">
            {evaluando ? (
              <p className="text-center text-sm font-semibold text-emerald-400">
                ✓ Certamen iniciado — la evaluación ya está activa.
              </p>
            ) : (
              <>
                <button
                  onClick={iniciarEvaluacion}
                  disabled={!completo || iniciando}
                  className="w-full rounded-2xl bg-gold-500 py-4 text-lg font-bold text-navy-900 transition hover:bg-gold-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {iniciando ? 'Iniciando…' : 'Iniciar Evaluación'}
                </button>
                {!completo && (
                  <p className="mt-3 text-center text-xs text-navy-400">
                    Completa todos los pasos para habilitar el inicio.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Jurados conectados */}
        <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-6">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
              Jurados conectados
            </p>
            <span className="text-xs text-navy-500">Se actualiza al recargar</span>
          </div>
          {jurados.length === 0 ? (
            <p className="mt-4 text-sm text-navy-500">Sin jurados registrados todavía.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {jurados.map((j) => (
                <li
                  key={j.id}
                  className="flex items-center justify-between rounded-lg bg-navy-800/50 px-3 py-2.5 text-sm"
                >
                  <span className="font-mono text-xs font-bold text-gold-400">{j.codigo}</span>
                  <span className="flex-1 truncate px-3 text-left text-white">{j.nombre}</span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      j.en_sesion
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-navy-600/40 text-navy-400'
                    }`}
                  >
                    {j.en_sesion ? 'En sesión' : 'Sin sesión'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Panel de evaluaciones */}
        <EvaluacionesPanel
          candidatas={candidatas}
          jurados={jurados}
          evaluaciones={evaluaciones}
          detalles={detalles}
          onRecargar={recargar}
        />

        {/* Accesos para jurados (QR + PDF) */}
        <AccesosJurados jurados={jurados} eventoNombre={evento?.nombre ?? 'Certamen de danza'} />

        {/* Paso 1 — Evento */}
        <Section numero={1} titulo="Evento" descripcion="Nombre y etapa del certamen" completado={!!evento}>
          {evento ? (
            <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-navy-800/50 px-4 py-3">
              <div>
                <p className="font-semibold text-white">{evento.nombre}</p>
                <p className="text-sm text-navy-300">
                  Etapa: <span className="text-gold-400">{evento.etapa}</span> · Estado:{' '}
                  <span className="text-gold-400">
                    {EVENT_STATE_LABELS[evento.estado as keyof typeof EVENT_STATE_LABELS] ?? evento.estado}
                  </span>
                </p>
              </div>
              <span className="text-emerald-400">✔</span>
            </div>
          ) : (
            <EventoForm onCreado={recargar} onError={setError} />
          )}
        </Section>

        {/* Paso 2 — Candidatas */}
        <Section numero={2} titulo="Candidatas" descripcion="Registra a las participantes" completado={candidatas.length > 0}>
          <CandidatasForm candidatas={candidatas} onCambio={recargar} onError={setError} />
        </Section>

        {/* Paso 3 — Jurados */}
        <Section numero={3} titulo="Jurados" descripcion="Se genera automáticamente un código (JUR-001…)" completado={jurados.length > 0}>
          <JuradosForm jurados={jurados} onCambio={recargar} onError={setError} />
        </Section>

        {/* Paso 4 — Criterios */}
        <Section numero={4} titulo="Criterios" descripcion="Carga los criterios oficiales según la etapa" completado={criteriosEtapa.length > 0}>
          <CriteriosForm
            etapa={etapa}
            criterios={criteriosEtapa}
            onCambio={recargar}
            onError={setError}
          />
        </Section>
      </div>
    </>
  )
}

/* ─── Accesos para jurados (QR) ──────────────────────────────────────── */

function AccesosJurados({
  jurados,
  eventoNombre,
}: {
  jurados: Jurado[]
  eventoNombre: string
}) {
  const [mostrando, setMostrando] = useState(false)
  const [avisoPdf, setAvisoPdf] = useState<string | null>(null)

  const generarPdf = () => {
    if (jurados.length === 0) return
    imprimirTarjetasAcceso(eventoNombre, jurados)
    setAvisoPdf('Se abrió la vista de impresión. Elige "Guardar como PDF" como destino.')
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
          Accesos para jurados
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setMostrando((v) => !v)}
            disabled={jurados.length === 0}
            className="rounded-lg bg-gold-500 px-4 py-2 text-xs font-semibold text-navy-900 transition hover:bg-gold-400 disabled:opacity-40"
          >
            {mostrando ? 'Ocultar tarjetas' : 'Generar accesos para jurados'}
          </button>
          <button
            onClick={generarPdf}
            disabled={jurados.length === 0}
            className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-navy-200 transition hover:bg-navy-800 hover:text-white disabled:opacity-40"
          >
            Descargar PDF
          </button>
        </div>
      </div>

      {jurados.length === 0 && (
        <p className="mt-4 text-sm text-navy-500">
          Registra jurados primero para generar sus accesos.
        </p>
      )}

      {mostrando && jurados.length > 0 && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jurados.map((j) => (
            <div
              key={j.id}
              className="flex flex-col items-center rounded-xl border border-white/10 bg-navy-800/60 p-4 text-center"
            >
              <p className="text-[10px] uppercase tracking-widest text-navy-400">
                Acceso del jurado
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-white">{j.nombre}</p>
              <p className="font-mono text-sm font-bold text-gold-400">{j.codigo}</p>
              <img
                src={urlQR(j.codigo, 180)}
                alt={`QR de ${j.codigo}`}
                className="mt-3 h-44 w-44 rounded-lg bg-white object-contain p-1.5"
              />
              <p className="mt-2 break-all text-[10px] leading-relaxed text-navy-400">
                {urlActivacion(j.codigo)}
              </p>
              <span
                className={`mt-3 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  j.activado
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-navy-600/40 text-navy-400'
                }`}
              >
                {j.activado ? '✔ Activado' : 'Pendiente de activación'}
              </span>
            </div>
          ))}
        </div>
      )}

      {avisoPdf && (
        <p className="mt-4 rounded-lg bg-navy-800/50 px-3 py-2 text-xs text-navy-300">{avisoPdf}</p>
      )}
    </div>
  )
}

/* ─── Panel de evaluaciones por candidata ─────────────────────────────── */

interface EvaluacionesPorCandidata {
  candidata: Candidata
  totalevaluado: number
  porJurado: { jurado: Jurado; promedio: number }[]
}

function EvaluacionesPanel({
  candidatas,
  jurados,
  evaluaciones,
  detalles,
  onRecargar,
}: {
  candidatas: Candidata[]
  jurados: Jurado[]
  evaluaciones: Evaluacion[]
  detalles: EvaluacionDetalle[]
  onRecargar: () => Promise<void>
}) {
  const mapa: EvaluacionesPorCandidata[] = candidatas.map((c) => {
    const evalsDeCandidata = evaluaciones.filter((ev) => ev.candidata_id === c.id)
    const porJurado = evalsDeCandidata
      .map((ev) => {
        const dets = detalles
          .filter((d) => d.evaluacion_id === ev.id)
          .reduce((acc, d) => acc + Number(d.puntaje), 0)
        const jurado = jurados.find((j) => j.id === ev.jurado_id)
        return { jurado, promedio: dets }
      })
      .filter((x) => x.jurado) as { jurado: Jurado; promedio: number }[]

    return {
      candidata: c,
      totalevaluado: evalsDeCandidata.length,
      porJurado,
    }
  })

  const totalJurados = jurados.length

  return (
    <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
          Evaluaciones por candidata
        </p>
        <span className="text-xs text-navy-500">Refresca con el botón Recargar</span>
        <button
          onClick={onRecargar}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-navy-200 transition hover:bg-navy-800 hover:text-white"
        >
          ↻ Recargar
        </button>
      </div>

      {candidatas.length === 0 ? (
        <p className="mt-4 text-sm text-navy-500">Sin candidatas registradas.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-widest text-navy-400">
                <th className="pb-2 pr-3 font-semibold">Candidata</th>
                {jurados.map((j) => (
                  <th key={j.id} className="pb-2 pr-3 text-center font-semibold">
                    {j.codigo}
                  </th>
                ))}
                <th className="pb-2 text-center font-semibold">Progreso</th>
              </tr>
            </thead>
            <tbody>
              {mapa.map((m) => (
                <tr key={m.candidata.id} className="border-t border-navy-700/40">
                  <td className="py-2.5 pr-3">
                    <span className="text-white">{m.candidata.nombre}</span>
                    <span className="text-navy-500"> · {m.candidata.grado}</span>
                  </td>
                  {jurados.map((j) => {
                    const fila = m.porJurado.find((p) => p.jurado.id === j.id)
                    return (
                      <td key={j.id} className="py-2.5 pr-3 text-center">
                        {fila ? (
                          <span className="font-mono text-xs font-bold text-gold-400">
                            {fila.promedio}
                          </span>
                        ) : (
                          <span className="text-navy-600">—</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="py-2.5 text-center">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        totalJurados > 0 && m.totalevaluado >= totalJurados
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-navy-600/40 text-navy-400'
                      }`}
                    >
                      {m.totalevaluado}/{totalJurados}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ─── Sección con número y estado ─────────────────────────────────────── */

interface SectionProps {
  numero: number
  titulo: string
  descripcion: string
  completado: boolean
  children: React.ReactNode
}

function Section({ numero, titulo, descripcion, completado, children }: SectionProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-navy-900/70 p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-800 text-sm font-bold text-gold-400 ring-1 ring-gold-500/30">
          {numero}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-white">{titulo}</h3>
          <p className="truncate text-xs text-navy-400">{descripcion}</p>
        </div>
        <span className={completado ? 'text-emerald-400' : 'text-navy-600'}>
          {completado ? '✔' : '○'}
        </span>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

/* ─── Evento ──────────────────────────────────────────────────────────── */

function EventoForm({
  onCreado,
  onError,
}: {
  onCreado: () => Promise<void>
  onError: (msg: string | null) => void
}) {
  const [nombre, setNombre] = useState('')
  const [etapa, setEtapa] = useState<string>(ETAPAS[0])

  const crear = async () => {
    if (!nombre.trim()) {
      onError('Ingresa el nombre del evento')
      return
    }
    const supabase = getSupabase()
    logConsulta('Asistente: crear evento')
    const { error } = await supabase.from('eventos').insert({
      nombre: nombre.trim(),
      etapa,
      estado: 'preparando',
    })
    if (error) {
      logError('crear evento', error.message)
      onError(error.message)
      return
    }
    onError(null)
    await onCreado()
  }

  return (
    <div className="space-y-2">
      <input
        placeholder="Nombre del certamen (ej: Gran Final Nacional 2026)"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-navy-800 px-3 py-2 text-sm text-white placeholder:text-navy-500"
      />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-navy-400">Etapa:</span>
        {ETAPAS.map((e) => (
          <button
            key={e}
            onClick={() => setEtapa(e)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              etapa === e
                ? 'bg-gold-500 text-navy-900'
                : 'bg-navy-800 text-navy-300 hover:bg-navy-700'
            }`}
          >
            {e}
          </button>
        ))}
      </div>
      <button
        onClick={crear}
        className="mt-2 w-full rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-navy-900 transition hover:bg-gold-400"
      >
        Crear evento
      </button>
    </div>
  )
}

/* ─── Candidatas ──────────────────────────────────────────────────────── */

function CandidatasForm({
  candidatas,
  onCambio,
  onError,
}: {
  candidatas: Candidata[]
  onCambio: () => Promise<void>
  onError: (msg: string | null) => void
}) {
  const [nombre, setNombre] = useState('')
  const [grado, setGrado] = useState('')
  const [seccion, setSeccion] = useState('')

  const agregar = async () => {
    if (!nombre.trim() || !grado.trim() || !seccion.trim()) {
      onError('Todos los campos son obligatorios')
      return
    }
    const supabase = getSupabase()
    logConsulta('Asistente: agregar candidata')
    const { error } = await supabase.from('candidatas').insert({
      nombre: nombre.trim(),
      grado: grado.trim(),
      seccion: seccion.trim(),
    })
    if (error) {
      logError('agregar candidata', error.message)
      onError(error.message)
      return
    }
    setNombre('')
    setGrado('')
    setSeccion('')
    onError(null)
    await onCambio()
  }

  const eliminar = async (id: string) => {
    const supabase = getSupabase()
    const { error } = await supabase.from('candidatas').delete().eq('id', id)
    if (error) {
      onError(error.message)
      return
    }
    onError(null)
    await onCambio()
  }

  return (
    <div>
      <div className="grid grid-cols-[1fr_90px_90px] gap-2">
        <input
          placeholder="Nombre completo"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="rounded-lg border border-white/10 bg-navy-800 px-3 py-2 text-sm text-white placeholder:text-navy-500"
        />
        <input
          placeholder="Grado"
          value={grado}
          onChange={(e) => setGrado(e.target.value)}
          className="rounded-lg border border-white/10 bg-navy-800 px-3 py-2 text-sm text-white placeholder:text-navy-500"
        />
        <input
          placeholder="Sección"
          value={seccion}
          onChange={(e) => setSeccion(e.target.value)}
          className="rounded-lg border border-white/10 bg-navy-800 px-3 py-2 text-sm text-white placeholder:text-navy-500"
        />
      </div>
      <button
        onClick={agregar}
        className="mt-2 w-full rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-navy-900 transition hover:bg-gold-400"
      >
        Agregar candidata
      </button>

      {candidatas.length > 0 && (
        <ul className="mt-4 max-h-56 space-y-1 overflow-y-auto">
          {candidatas.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-lg bg-navy-800/50 px-3 py-2 text-sm"
            >
              <span className="truncate text-white">
                <span className="font-semibold">{c.nombre}</span>
                <span className="text-navy-400"> · {c.grado} · {c.seccion}</span>
              </span>
              <button
                onClick={() => eliminar(c.id)}
                className="ml-3 shrink-0 rounded bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-400 transition hover:bg-red-500/20"
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ─── Jurados ─────────────────────────────────────────────────────────── */

function JuradosForm({
  jurados,
  onCambio,
  onError,
}: {
  jurados: Jurado[]
  onCambio: () => Promise<void>
  onError: (msg: string | null) => void
}) {
  const [nombre, setNombre] = useState('')

  const siguienteCodigo = useMemo(() => {
    const maxN = jurados.reduce((max, j) => {
      const n = parseInt(j.codigo.replace(/^JUR-/i, ''), 10)
      return Number.isFinite(n) ? Math.max(max, n) : max
    }, 0)
    return `JUR-${String(maxN + 1).padStart(3, '0')}`
  }, [jurados])

  const agregar = async () => {
    if (!nombre.trim()) {
      onError('Ingresa el nombre del jurado')
      return
    }
    const supabase = getSupabase()
    logConsulta(`Asistente: agregar jurado con código ${siguienteCodigo}`)
    const { error } = await supabase.from('jurados').insert({
      nombre: nombre.trim(),
      codigo: siguienteCodigo,
    })
    if (error) {
      logError('agregar jurado', error.message)
      onError(error.message)
      return
    }
    setNombre('')
    onError(null)
    await onCambio()
  }

  const eliminar = async (id: string) => {
    const supabase = getSupabase()
    const { error } = await supabase.from('jurados').delete().eq('id', id)
    if (error) {
      onError(error.message)
      return
    }
    onError(null)
    await onCambio()
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          placeholder="Nombre del jurado"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="flex-1 rounded-lg border border-white/10 bg-navy-800 px-3 py-2 text-sm text-white placeholder:text-navy-500"
        />
        <div className="flex items-center rounded-lg border border-gold-500/30 bg-gold-500/10 px-3 text-xs font-bold text-gold-400">
          {siguienteCodigo}
        </div>
      </div>
      <button
        onClick={agregar}
        className="mt-2 w-full rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-navy-900 transition hover:bg-gold-400"
      >
        Agregar jurado
      </button>

      {jurados.length > 0 && (
        <ul className="mt-4 max-h-56 space-y-1 overflow-y-auto">
          {jurados.map((j) => (
            <li
              key={j.id}
              className="flex items-center justify-between rounded-lg bg-navy-800/50 px-3 py-2 text-sm"
            >
              <span className="truncate">
                <span className="font-mono text-xs font-bold text-gold-400">{j.codigo}</span>
                <span className="ml-2 text-white">{j.nombre}</span>
              </span>
              <button
                onClick={() => eliminar(j.id)}
                className="ml-3 shrink-0 rounded bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-400 transition hover:bg-red-500/20"
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ─── Criterios ───────────────────────────────────────────────────────── */

function CriteriosForm({
  etapa,
  criterios,
  onCambio,
  onError,
}: {
  etapa: string
  criterios: Criterio[]
  onCambio: () => Promise<void>
  onError: (msg: string | null) => void
}) {
  const [cargando, setCargando] = useState(false)
  const oficiales = CRITERIOS_OFICIALES[etapa]

  const cargar = async () => {
    if (!etapa || !oficiales) return
    setCargando(true)
    const supabase = getSupabase()
    logConsulta(`Asistente: cargar criterios oficiales para etapa "${etapa}"`)
    const { error } = await supabase.from('criterios').upsert(
      oficiales.map((c, i) => ({
        etapa,
        nombre: c.nombre,
        puntaje_maximo: c.puntaje_maximo,
        orden: i + 1,
      })),
      { onConflict: 'etapa,orden' },
    )
    if (error) {
      logError('cargar criterios', error.message)
      onError(error.message)
    }
    setCargando(false)
    onError(null)
    await onCambio()
  }

  if (!etapa) {
    return <p className="text-sm text-navy-500">Primero crea el evento para definir la etapa.</p>
  }

  return (
    <div>
      <div className="rounded-lg border border-white/10 bg-navy-800/50 p-3 text-xs leading-relaxed text-navy-300">
        Etapa actual: <strong className="text-gold-400">{etapa}</strong> — los criterios oficiales
        para esta etapa se insertarán en la base de datos.
      </div>
      <button
        onClick={cargar}
        disabled={cargando || (criterios.length > 0 && !criterios.some((c) => c.etapa === etapa && c.orden === oficiales?.length))}
        className="mt-3 w-full rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-navy-900 transition hover:bg-gold-400 disabled:opacity-40"
      >
        {cargando ? 'Cargando…' : 'Cargar criterios oficiales'}
      </button>

      {criterios.length > 0 ? (
        <ul className="mt-4 space-y-1">
          {criterios.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-lg bg-navy-800/50 px-3 py-2 text-sm"
            >
              <span className="text-white">
                <span className="text-navy-500">#{c.orden} </span>
                {c.nombre}
              </span>
              <span className="font-mono text-xs font-bold text-gold-400">{c.puntaje_maximo} pts</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-center text-sm text-navy-500">Sin criterios cargados todavía.</p>
      )}
    </div>
  )
}