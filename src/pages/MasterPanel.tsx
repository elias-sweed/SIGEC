import { useEffect, useState, useCallback } from 'react'
import PageHeader from '../components/PageHeader'
import { useCertamen } from '../context/CertamenContext'
import { getSupabase } from '../lib/supabase'
import { logConsulta, logFilas, logError } from '../utils/devlog'
import { type EventState } from '../constants/eventStates'
import EventStatusCard from '../components/event/EventStatusCard'
import CandidateCard from '../components/event/CandidateCard'
import JuryProgressCard from '../components/event/JuryProgressCard'
import type { Candidata } from '../types/database'

interface JuradoInfo {
  id: string
  nombre: string
  respondio: boolean
}

const TRANSITIONS: Record<EventState, EventState | null> = {
  preparando:        'evaluando',
  evaluando:         'esperando_jurados',
  esperando_jurados: 'resultados_listos',
  resultados_listos: 'publicado',
  publicado:         null,
}

export default function MasterPanel() {
  const {
    eventoCandidato,
    candidataActual,
    estadoEvento,
    cargarEstado,
    actualizarCandidata,
  } = useCertamen()

  const [candidatas, setCandidatas] = useState<Candidata[]>([])
  const [jurados, setJurados] = useState<{ id: string; nombre: string }[]>([])
  const [juradoProgress, setJuradoProgress] = useState<JuradoInfo[]>([])
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const supabase = getSupabase()
      logConsulta('MasterPanel: jurados')
      const { data: juradosData } = await supabase.from('jurados').select('id, nombre')
      if (juradosData) {
        logFilas('jurados', juradosData)
        setJurados(juradosData as { id: string; nombre: string }[])
      }

      logConsulta('MasterPanel: candidatas')
      const { data: candidatasData } = await supabase.from('candidatas').select('*')
      if (candidatasData) {
        logFilas('candidatas', candidatasData)
        setCandidatas(candidatasData as Candidata[])
      }
    })()
  }, [])

  const loadJuradoProgress = useCallback(async () => {
    if (!candidataActual || !eventoCandidato) {
      setJuradoProgress([])
      return
    }

    const supabase = getSupabase()
    logConsulta(`MasterPanel: evaluaciones candidata=${candidataActual.id}`)
    const { data: evals } = await supabase
      .from('evaluaciones')
      .select('jurado_id')
      .eq('evento_id', eventoCandidato.id)
      .eq('candidata_id', candidataActual.id)

    const juradoIdsQueRespondieron = new Set<string>(
      (evals ?? []).map((e: { jurado_id: string }) => e.jurado_id),
    )
    logFilas('evaluaciones para candidata', evals ?? [])

    setJuradoProgress(
      jurados.map((j) => ({
        id: j.id,
        nombre: j.nombre,
        respondio: juradoIdsQueRespondieron.has(j.id),
      })),
    )
  }, [candidataActual, eventoCandidato, jurados])

  useEffect(() => {
    loadJuradoProgress()
  }, [loadJuradoProgress])

  useEffect(() => {
    if (estadoEvento?.updated_at) {
      setLastUpdate(new Date(estadoEvento.updated_at).toLocaleTimeString())
    }
  }, [estadoEvento])

  const handleStateChange = async (newState: EventState) => {
    if (!eventoCandidato) return
    const supabase = getSupabase()
    logConsulta(`MasterPanel: cambiar estado a ${newState}`)

    if (estadoEvento) {
      const { error } = await supabase
        .from('estado_evento')
        .update({ estado: newState, updated_at: new Date().toISOString() })
        .eq('evento_id', estadoEvento.evento_id)

      if (error) {
        logError('cambiar estado', error.message)
        return
      }
    } else {
      const candidataInicial = candidatas[0]?.id ?? null
      const { error } = await supabase.from('estado_evento').insert({
        evento_id: eventoCandidato.id,
        candidata_actual_id: candidataInicial,
        estado: newState,
      })

      if (error) {
        logError('crear estado inicial', error.message)
        return
      }
    }

    cargarEstado()
  }

  const handleCandidateChange = async (direction: 'prev' | 'next') => {
    if (!candidataActual || candidatas.length === 0) return
    const currentIdx = candidatas.findIndex((c) => c.id === candidataActual.id)
    const newIdx =
      direction === 'next'
        ? (currentIdx + 1) % candidatas.length
        : (currentIdx - 1 + candidatas.length) % candidatas.length
    await actualizarCandidata(candidatas[newIdx].id)
  }

  const currentState: EventState = (estadoEvento?.estado as EventState) || 'preparando'
  const nextState = TRANSITIONS[currentState]
  const completados = juradoProgress.filter((j) => j.respondio).length

  return (
    <>
      <PageHeader
        eyebrow="Panel de administración"
        title="Centro de Control"
        description="Gestiona el estado del certamen, candidatas y avance de jurados."
      />

      <div className="mx-auto mt-6 grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        {/* Main content */}
        <div className="space-y-6">
          {/* Block A – Evento */}
          {eventoCandidato && (
            <EventStatusCard
              nombre={eventoCandidato.nombre}
              etapa={eventoCandidato.etapa}
              estado={currentState}
            >
              {!estadoEvento ? (
                <button
                  onClick={() => handleStateChange('preparando')}
                  className="mt-1 w-full rounded-xl bg-gold-500 px-4 py-3 text-sm font-bold text-navy-900 transition hover:bg-gold-400 active:scale-[0.98]"
                >
                  Crear e iniciar certamen
                </button>
              ) : (
                <>
                  {nextState && (
                    <button
                      onClick={() => handleStateChange(nextState)}
                      className="mt-1 w-full rounded-xl bg-gold-500 px-4 py-3 text-sm font-bold text-navy-900 transition hover:bg-gold-400 active:scale-[0.98]"
                    >
                      {nextState === 'evaluando' && '▶ Iniciar evaluación'}
                      {nextState === 'esperando_jurados' && 'Cerrar evaluación'}
                      {nextState === 'resultados_listos' && 'Verificar resultados'}
                      {nextState === 'publicado' && 'Publicar resultados'}
                    </button>
                  )}
                  {currentState === 'evaluando' && (
                    <button
                      onClick={() => handleStateChange('preparando')}
                      className="w-full rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-navy-300 transition hover:bg-navy-800"
                    >
                      Volver a Preparando
                    </button>
                  )}
                </>
              )}
            </EventStatusCard>
          )}

          {/* Block B – Candidata activa */}
          {candidataActual && (
            <CandidateCard
              nombre={candidataActual.nombre}
              grado={candidataActual.grado}
              seccion={candidataActual.seccion}
              onPrevious={() => handleCandidateChange('prev')}
              onNext={() => handleCandidateChange('next')}
              disabled={candidatas.length <= 1}
            />
          )}

          {/* Block C – Progreso de jurados */}
          <JuryProgressCard
            total={jurados.length}
            completados={completados}
            jurados={juradoProgress}
          />

          {/* CRUD Candidatas */}
          <CandidatasManager
            candidatas={candidatas}
            onRefresh={cargarEstado}
          />

          {/* CRUD Criterios */}
          <CriteriosManager
            etapa={eventoCandidato?.etapa}
          />
        </div>

        {/* Block D – Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">Resumen</p>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-navy-300">Última actualización</span>
                <span className="font-medium text-white">{lastUpdate || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-300">Evento activo</span>
                <span className="font-medium text-white">
                  {eventoCandidato?.nombre || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-300">Candidatas</span>
                <span className="font-semibold text-white">{candidatas.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-300">Jurados</span>
                <span className="font-semibold text-white">{jurados.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-300">Jurados respondieron</span>
                <span className="font-semibold text-emerald-400">{completados}/{jurados.length}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  )
}

/* ─── Sub-componente: CRUD Candidatas ─────────────────────────────────── */

interface CandidatasManagerProps {
  candidatas: Candidata[]
  onRefresh: () => void
}

function CandidatasManager({ candidatas, onRefresh }: CandidatasManagerProps) {
  const [nombre, setNombre] = useState('')
  const [grado, setGrado] = useState('')
  const [seccion, setSeccion] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editGrado, setEditGrado] = useState('')
  const [editSeccion, setEditSeccion] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async () => {
    if (!nombre.trim() || !grado.trim() || !seccion.trim()) {
      setError('Todos los campos son obligatorios')
      return
    }
    const supabase = getSupabase()
    logConsulta('Insertar candidata')
    const { error: insertError } = await supabase
      .from('candidatas')
      .insert({ nombre: nombre.trim(), grado: grado.trim(), seccion: seccion.trim() })

    if (insertError) {
      logError('insertar candidata', insertError.message)
      setError(insertError.message)
      return
    }
    setNombre('')
    setGrado('')
    setSeccion('')
    setError(null)
    onRefresh()
  }

  const handleUpdate = async (id: string) => {
    if (!editNombre.trim() || !editGrado.trim() || !editSeccion.trim()) return
    const supabase = getSupabase()
    const { error } = await supabase
      .from('candidatas')
      .update({ nombre: editNombre.trim(), grado: editGrado.trim(), seccion: editSeccion.trim() })
      .eq('id', id)

    if (error) {
      logError('actualizar candidata', error.message)
      setError(error.message)
      return
    }
    setEditId(null)
    setError(null)
    onRefresh()
  }

  const handleDelete = async (id: string) => {
    const supabase = getSupabase()
    logConsulta(`Eliminar candidata id=${id}`)
    const { error } = await supabase.from('candidatas').delete().eq('id', id)
    if (error) {
      logError('eliminar candidata', error.message)
      setError(error.message)
      return
    }
    setError(null)
    onRefresh()
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">Candidatas</p>

      {error && (
        <p className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2">
        <input
          placeholder="Nombre"
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
        onClick={handleAdd}
        className="mt-3 w-full rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-navy-900 transition hover:bg-gold-400"
      >
        Agregar candidata
      </button>

      <div className="mt-4 max-h-64 overflow-y-auto">
        {candidatas.length === 0 ? (
          <p className="py-4 text-center text-sm text-navy-500">Sin candidatas registradas</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {candidatas.map((c) =>
              editId === c.id ? (
                <li key={c.id} className="space-y-2 py-3">
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                      className="rounded-lg border border-white/10 bg-navy-800 px-2 py-1.5 text-sm text-white"
                    />
                    <input
                      value={editGrado}
                      onChange={(e) => setEditGrado(e.target.value)}
                      className="rounded-lg border border-white/10 bg-navy-800 px-2 py-1.5 text-sm text-white"
                    />
                    <input
                      value={editSeccion}
                      onChange={(e) => setEditSeccion(e.target.value)}
                      className="rounded-lg border border-white/10 bg-navy-800 px-2 py-1.5 text-sm text-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdate(c.id)}
                      className="flex-1 rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-500"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      className="flex-1 rounded bg-navy-700 px-3 py-1 text-xs font-semibold text-navy-200 transition hover:bg-navy-600"
                    >
                      Cancelar
                    </button>
                  </div>
                </li>
              ) : (
                <li key={c.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{c.nombre}</p>
                    <p className="text-xs text-navy-400">{c.grado} · {c.seccion}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => {
                        setEditId(c.id)
                        setEditNombre(c.nombre)
                        setEditGrado(c.grado)
                        setEditSeccion(c.seccion)
                      }}
                      className="rounded px-2 py-1 text-xs text-navy-300 transition hover:bg-navy-800 hover:text-white"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="rounded px-2 py-1 text-xs text-red-400 transition hover:bg-red-500/10"
                    >
                      Eliminar
                    </button>
                  </div>
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    </div>
  )
}

/* ─── Sub-componente: CRUD Criterios ─────────────────────────────────── */

interface CriteriosManagerProps {
  etapa: string | undefined
}

interface CriterioRow {
  id: string
  etapa: string
  nombre: string
  puntaje_maximo: number
  orden: number
}

function CriteriosManager({ etapa }: CriteriosManagerProps) {
  const [criterios, setCriterios] = useState<CriterioRow[]>([])
  const [nombre, setNombre] = useState('')
  const [puntajeMax, setPuntajeMax] = useState(10)
  const [orden, setOrden] = useState(1)
  const [editId, setEditId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editPuntajeMax, setEditPuntajeMax] = useState(10)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!etapa) return
    ;(async () => {
      const supabase = getSupabase()
      logConsulta(`CriteriosManager: cargar etapa=${etapa}`)
      const { data } = await supabase
        .from('criterios')
        .select('*')
        .eq('etapa', etapa)
        .order('orden')
      if (data) {
        logFilas('criterios', data)
        setCriterios(data as CriterioRow[])
      }
    })()
  }, [etapa])

  const refresh = async () => {
    if (!etapa) return
    const supabase = getSupabase()
    const { data } = await supabase
      .from('criterios')
      .select('*')
      .eq('etapa', etapa)
      .order('orden')
    if (data) setCriterios(data as CriterioRow[])
  }

  const handleAdd = async () => {
    if (!nombre.trim() || !etapa) {
      setError('Nombre y etapa son obligatorios')
      return
    }
    const supabase = getSupabase()
    logConsulta('Insertar criterio')
    const { error: insertError } = await supabase.from('criterios').insert({
      etapa,
      nombre: nombre.trim(),
      puntaje_maximo: puntajeMax,
      orden,
    })

    if (insertError) {
      logError('insertar criterio', insertError.message)
      setError(insertError.message)
      return
    }
    setNombre('')
    setPuntajeMax(10)
    setOrden(criterios.length + 1)
    setError(null)
    refresh()
  }

  const handleUpdate = async (id: string) => {
    if (!editNombre.trim()) return
    const supabase = getSupabase()
    const { error } = await supabase
      .from('criterios')
      .update({ nombre: editNombre.trim(), puntaje_maximo: editPuntajeMax })
      .eq('id', id)

    if (error) {
      logError('actualizar criterio', error.message)
      setError(error.message)
      return
    }
    setEditId(null)
    setError(null)
    refresh()
  }

  const handleDelete = async (id: string) => {
    const supabase = getSupabase()
    const { error } = await supabase.from('criterios').delete().eq('id', id)
    if (error) {
      logError('eliminar criterio', error.message)
      setError(error.message)
      return
    }
    setError(null)
    refresh()
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
        Criterios {etapa ? `· ${etapa}` : ''}
      </p>

      {error && (
        <p className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      <div className="mt-4 grid grid-cols-[1fr_80px_60px] gap-2">
        <input
          placeholder="Nombre del criterio"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="rounded-lg border border-white/10 bg-navy-800 px-3 py-2 text-sm text-white placeholder:text-navy-500"
        />
        <input
          type="number"
          placeholder="Pts"
          value={puntajeMax}
          onChange={(e) => setPuntajeMax(Number(e.target.value))}
          className="rounded-lg border border-white/10 bg-navy-800 px-3 py-2 text-sm text-white"
        />
        <input
          type="number"
          placeholder="#"
          value={orden}
          onChange={(e) => setOrden(Number(e.target.value))}
          className="rounded-lg border border-white/10 bg-navy-800 px-3 py-2 text-sm text-white"
        />
      </div>
      <button
        onClick={handleAdd}
        className="mt-3 w-full rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-navy-900 transition hover:bg-gold-400"
      >
        Agregar criterio
      </button>

      <div className="mt-4 max-h-64 overflow-y-auto">
        {criterios.length === 0 ? (
          <p className="py-4 text-center text-sm text-navy-500">Sin criterios registrados</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {criterios.map((cr) =>
              editId === cr.id ? (
                <li key={cr.id} className="space-y-2 py-3">
                  <div className="grid grid-cols-[1fr_80px] gap-2">
                    <input
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                      className="rounded-lg border border-white/10 bg-navy-800 px-2 py-1.5 text-sm text-white"
                    />
                    <input
                      type="number"
                      value={editPuntajeMax}
                      onChange={(e) => setEditPuntajeMax(Number(e.target.value))}
                      className="rounded-lg border border-white/10 bg-navy-800 px-2 py-1.5 text-sm text-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdate(cr.id)}
                      className="flex-1 rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-500"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      className="flex-1 rounded bg-navy-700 px-3 py-1 text-xs font-semibold text-navy-200 transition hover:bg-navy-600"
                    >
                      Cancelar
                    </button>
                  </div>
                </li>
              ) : (
                <li key={cr.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{cr.nombre}</p>
                    <p className="text-xs text-navy-400">
                      {cr.puntaje_maximo} pts · orden {cr.orden}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => {
                        setEditId(cr.id)
                        setEditNombre(cr.nombre)
                        setEditPuntajeMax(cr.puntaje_maximo)
                      }}
                      className="rounded px-2 py-1 text-xs text-navy-300 transition hover:bg-navy-800 hover:text-white"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(cr.id)}
                      className="rounded px-2 py-1 text-xs text-red-400 transition hover:bg-red-500/10"
                    >
                      Eliminar
                    </button>
                  </div>
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    </div>
  )
}
