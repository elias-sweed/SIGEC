import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { useCertamen } from '../context/CertamenContext'
import { getSupabase } from '../lib/supabase'
import { logConsulta, logFilas } from '../utils/devlog'
import type { Candidata, Criterio, Evento } from '../types/database'

interface EstadoError {
  tipo: 'error' | 'exito'
  texto: string
}

export default function MasterPanel() {
  const { eventoCandidato, candidataActual, estadoEvento, cargando, actualizarCandidata, cargarEstado } =
    useCertamen()

  // Datos
  const [evento, setEvento] = useState<Evento | null>(eventoCandidato)
  const [candidatas, setCandidatas] = useState<Candidata[]>([])
  const [criterios, setCriterios] = useState<Criterio[]>([])

  // UI state
  const [error, setError] = useState<string | null>(null)
  const [seleccionando, setSeleccionando] = useState<string | null>(null)
  const [estadoMsj, setEstadoMsj] = useState<EstadoError | null>(null)

  // Candidatas: formulario
  const [fNombre, setFNombre] = useState('')
  const [fGrado, setFGrado] = useState('')
  const [fSeccion, setFSeccion] = useState('')
  const [guardandoCandidata, setGuardandoCandidata] = useState(false)
  const [editandoCandidata, setEditandoCandidata] = useState<string | null>(null)
  const [eNombre, setENombre] = useState('')
  const [eGrado, setEGrado] = useState('')
  const [eSeccion, setESeccion] = useState('')

  // Criterios: formulario
  const [fcEtapa, setFcEtapa] = useState('final')
  const [fcNombre, setFcNombre] = useState('')
  const [fcPuntaje, setFcPuntaje] = useState('')
  const [fcOrden, setFcOrden] = useState('')
  const [guardandoCriterio, setGuardandoCriterio] = useState(false)
  const [editandoCriterio, setEditandoCriterio] = useState<string | null>(null)
  const [ecNombre, setEcNombre] = useState('')
  const [ecPuntaje, setEcPuntaje] = useState('')

  useEffect(() => {
    setEvento(eventoCandidato)
  }, [eventoCandidato])

  useEffect(() => {
    ;(async () => {
      try {
        const supabase = getSupabase()

        logConsulta('MasterPanel: candidatas')
        const { data: listaCand, error: errCand } = await supabase
          .from('candidatas').select('*').order('nombre')
        if (errCand) throw errCand
        logFilas('candidatas', listaCand ?? [])
        setCandidatas((listaCand ?? []) as Candidata[])

        if (eventoCandidato) {
          logConsulta(`MasterPanel: criterios etapa=${eventoCandidato.etapa}`)
          const { data: listaCrit, error: errCrit } = await supabase
            .from('criterios').select('*').eq('etapa', eventoCandidato.etapa).order('orden')
          if (errCrit) throw errCrit
          logFilas('criterios', listaCrit ?? [])
          setCriterios((listaCrit ?? []) as Criterio[])
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'No se pudo conectar con Supabase.',
        )
      }
    })()
  }, [eventoCandidato])

  async function handleSeleccionar(candidataId: string) {
    setSeleccionando(candidataId)
    setError(null)
    try {
      await actualizarCandidata(candidataId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el estado del evento.')
    } finally {
      setSeleccionando(null)
    }
  }

  // ─── Evento: crear estado inicial ────────────────────────────────────
  async function crearEstadoInicial() {
    try {
      const supabase = getSupabase()
      const { data: ev } = await supabase.from('eventos').select('*').order('created_at').limit(1).maybeSingle()
      if (!ev) { setEstadoMsj({ tipo: 'error', texto: 'No hay eventos. Aplica el seed primero.' }); return }
      const { data: ca } = await supabase.from('candidatas').select('*').order('nombre').limit(1).maybeSingle()
      const { error: insErr } = await supabase.from('estado_evento').insert({
        evento_id: ev.id, candidata_actual_id: ca?.id ?? null, estado: 'activo',
      })
      if (insErr) throw insErr
      setEstadoMsj({ tipo: 'exito', texto: 'Estado inicial creado correctamente.' })
      await cargarEstado()
    } catch (err) {
      setEstadoMsj({ tipo: 'error', texto: err instanceof Error ? err.message : 'No se pudo crear el estado.' })
    }
  }

  // ─── Candidatas CRUD ─────────────────────────────────────────────────
  async function agregarCandidata() {
    if (!fNombre.trim() || !fGrado.trim() || !fSeccion.trim()) return
    setGuardandoCandidata(true)
    try {
      const supabase = getSupabase()
      logConsulta('Insertar candidata', { nombre: fNombre, grado: fGrado, seccion: fSeccion })
      const { data, error } = await supabase
        .from('candidatas')
        .insert({ nombre: fNombre.trim(), grado: fGrado.trim(), seccion: fSeccion.trim() })
        .select('*')
        .single()
      if (error) throw error
      logFilas('candidata insertada', [data])
      setCandidatas((prev) => [...prev, data as Candidata].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setFNombre(''); setFGrado(''); setFSeccion('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar candidata.')
    } finally {
      setGuardandoCandidata(false)
    }
  }

  function iniciarEdicionCandidata(c: Candidata) {
    setEditandoCandidata(c.id); setENombre(c.nombre); setEGrado(c.grado); setESeccion(c.seccion)
  }

  async function guardarEdicionCandidata(id: string) {
    if (!eNombre.trim() || !eGrado.trim() || !eSeccion.trim()) return
    try {
      const supabase = getSupabase()
      logConsulta(`Actualizar candidata id=${id}`)
      const { data, error } = await supabase
        .from('candidatas')
        .update({ nombre: eNombre.trim(), grado: eGrado.trim(), seccion: eSeccion.trim() })
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      setCandidatas((prev) => prev.map((c) => (c.id === id ? (data as Candidata) : c)))
      setEditandoCandidata(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al editar candidata.')
    }
  }

  async function eliminarCandidata(id: string) {
    try {
      const supabase = getSupabase()
      logConsulta(`Eliminar candidata id=${id}`)
      const { error } = await supabase.from('candidatas').delete().eq('id', id)
      if (error) throw error
      setCandidatas((prev) => prev.filter((c) => c.id !== id))
      if (candidataActual?.id === id) await actualizarCandidata(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar: tiene evaluaciones asociadas u otro error.')
    }
  }

  // ─── Criterios CRUD ──────────────────────────────────────────────────
  async function agregarCriterio() {
    if (!fcNombre.trim() || !fcPuntaje || !fcOrden) return
    setGuardandoCriterio(true)
    try {
      const supabase = getSupabase()
      logConsulta('Insertar criterio', { etapa: fcEtapa, nombre: fcNombre, puntaje_maximo: Number(fcPuntaje), orden: Number(fcOrden) })
      const { data, error } = await supabase
        .from('criterios')
        .insert({
          etapa: fcEtapa.trim(),
          nombre: fcNombre.trim(),
          puntaje_maximo: Number(fcPuntaje),
          orden: Number(fcOrden),
        })
        .select('*')
        .single()
      if (error) throw error
      logFilas('criterio insertado', [data])
      setCriterios((prev) => [...prev, data as Criterio].sort((a, b) => a.orden - b.orden))
      setFcNombre(''); setFcPuntaje(''); setFcOrden('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar criterio.')
    } finally {
      setGuardandoCriterio(false)
    }
  }

  function iniciarEdicionCriterio(c: Criterio) {
    setEditandoCriterio(c.id); setEcNombre(c.nombre); setEcPuntaje(String(c.puntaje_maximo))
  }

  async function guardarEdicionCriterio(id: string) {
    if (!ecNombre.trim() || !ecPuntaje) return
    try {
      const supabase = getSupabase()
      logConsulta(`Actualizar criterio id=${id}`)
      const { data, error } = await supabase
        .from('criterios')
        .update({ nombre: ecNombre.trim(), puntaje_maximo: Number(ecPuntaje) })
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      setCriterios((prev) => prev.map((c) => (c.id === id ? (data as Criterio) : c)))
      setEditandoCriterio(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al editar criterio.')
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Organización"
        title="Panel Maestro"
        description="Administra el evento: selecciona candidatas, crea candidatas nuevas y configura los criterios de evaluación."
      />

      {error && (
        <div className="mx-auto mt-6 max-w-3xl rounded-xl border border-red-400/30 bg-red-400/10 px-5 py-3 text-center text-sm text-red-200">
          {error}
          <button onClick={() => setError(null)} className="ml-3 text-xs text-red-400 underline">✕</button>
        </div>
      )}

      {/* ─── Estado del evento ─────────────────────────────────────────── */}
      <section className="mx-auto mt-8 max-w-3xl rounded-xl border border-white/10 bg-navy-900/70 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">Estado del evento</p>
            {evento ? (
              <h2 className="mt-1 text-xl font-bold text-white">{evento.nombre}</h2>
            ) : !cargando ? (
              <p className="mt-1 text-navy-300">No se encontró ningún evento.</p>
            ) : null}
          </div>
          {evento && (
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-gold-500/15 px-3 py-1 text-gold-300">Etapa: {evento.etapa}</span>
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-300">{evento.estado}</span>
            </div>
          )}
        </div>

        {estadoEvento ? (
          <div className="mt-4 rounded-lg border border-gold-500/25 bg-gold-500/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">Candidata seleccionada</p>
            {candidataActual ? (
              <>
                <p className="mt-1 text-lg font-bold text-white">{candidataActual.nombre}</p>
                <p className="text-sm text-navy-300">{candidataActual.grado} · Sección {candidataActual.seccion}</p>
                <p className="mt-1 text-xs text-navy-400">
                  Última actualización: {new Date(estadoEvento.updated_at).toLocaleString('es-PE')}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-navy-300">Ninguna candidata seleccionada.</p>
            )}
          </div>
        ) : !cargando && (
          <div className="mt-4 rounded-lg border border-dashed border-navy-600 p-4 text-center">
            <p className="text-sm text-navy-300">No existe un estado activo para este evento.</p>
            <button
              onClick={crearEstadoInicial}
              className="btn-primary mt-3"
            >
              Crear estado inicial
            </button>
            {estadoMsj && (
              <p className={`mt-2 text-xs font-semibold ${estadoMsj.tipo === 'exito' ? 'text-emerald-300' : 'text-red-300'}`}>
                {estadoMsj.texto}
              </p>
            )}
          </div>
        )}
      </section>

      {/* ─── Candidatas ────────────────────────────────────────────────── */}
      <section className="mx-auto mt-8 max-w-3xl space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-navy-200">Candidatas</h3>

        <form
          onSubmit={(e) => { e.preventDefault(); agregarCandidata() }}
          className="rounded-xl border border-white/10 bg-navy-900/70 p-4"
        >
          <p className="mb-3 text-xs font-semibold text-navy-300">Agregar candidata</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <input type="text" placeholder="Nombre" value={fNombre} onChange={(e) => setFNombre(e.target.value)}
              className="rounded-lg border border-white/10 bg-navy-800 px-3 py-2 text-sm text-white focus:border-gold-500 focus:outline-none" />
            <input type="text" placeholder="Grado (ej: 5°)" value={fGrado} onChange={(e) => setFGrado(e.target.value)}
              className="rounded-lg border border-white/10 bg-navy-800 px-3 py-2 text-sm text-white focus:border-gold-500 focus:outline-none" />
            <input type="text" placeholder="Sección (ej: A)" value={fSeccion} onChange={(e) => setFSeccion(e.target.value)}
              className="rounded-lg border border-white/10 bg-navy-800 px-3 py-2 text-sm text-white focus:border-gold-500 focus:outline-none" />
          </div>
          <button type="submit" disabled={guardandoCandidata || !fNombre.trim() || !fGrado.trim() || !fSeccion.trim()}
            className="btn-primary mt-3 disabled:opacity-50 disabled:cursor-not-allowed">
            {guardandoCandidata ? 'Guardando…' : 'Agregar candidata'}
          </button>
        </form>

        {candidatas.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-navy-900/90 text-xs uppercase tracking-wide text-navy-300">
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Grado</th>
                  <th className="px-4 py-3">Sección</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {candidatas.map((c) => {
                  const activa = candidataActual?.id === c.id
                  const proc = seleccionando === c.id
                  const editando = editandoCandidata === c.id
                  return (
                    <tr key={c.id} className={`border-b border-white/5 transition-colors ${activa ? 'bg-gold-500/10' : 'bg-navy-900/70 hover:bg-navy-900'}`}>
                      {editando ? (
                        <>
                          <td className="px-4 py-2"><input type="text" value={eNombre} onChange={(e) => setENombre(e.target.value)} className="w-full rounded border border-gold-500/50 bg-navy-800 px-2 py-1 text-white focus:outline-none" /></td>
                          <td className="px-4 py-2"><input type="text" value={eGrado} onChange={(e) => setEGrado(e.target.value)} className="w-full rounded border border-gold-500/50 bg-navy-800 px-2 py-1 text-white focus:outline-none" /></td>
                          <td className="px-4 py-2"><input type="text" value={eSeccion} onChange={(e) => setESeccion(e.target.value)} className="w-full rounded border border-gold-500/50 bg-navy-800 px-2 py-1 text-white focus:outline-none" /></td>
                          <td className="px-4 py-2 text-right">
                            <button onClick={() => guardarEdicionCandidata(c.id)} className="mr-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300">Guardar</button>
                            <button onClick={() => setEditandoCandidata(null)} className="text-xs text-navy-400 hover:text-white">Cancelar</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 font-medium text-white">{c.nombre}</td>
                          <td className="px-4 py-3 text-navy-200">{c.grado}</td>
                          <td className="px-4 py-3 text-navy-200">{c.seccion}</td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => handleSeleccionar(c.id)} disabled={activa || proc}
                              className={`mr-2 text-xs font-semibold ${activa ? 'text-gold-300' : 'text-gold-400 hover:text-gold-300'} disabled:opacity-50`}>
                              {proc ? 'Guardando…' : activa ? '✓ Seleccionada' : 'Seleccionar'}
                            </button>
                            <button onClick={() => iniciarEdicionCandidata(c)} className="mr-2 text-xs text-navy-300 hover:text-white">Editar</button>
                            <button onClick={() => eliminarCandidata(c.id)} className="text-xs text-red-400 hover:text-red-300">Eliminar</button>
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-navy-600 py-4 text-center text-sm text-navy-400">
            {error ? 'Error al cargar candidatas.' : 'Sin candidatas. Usa el formulario de arriba para agregar la primera.'}
          </p>
        )}
      </section>

      {/* ─── Criterios ─────────────────────────────────────────────────── */}
      <section className="mx-auto mt-10 max-w-3xl space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-navy-200">Criterios de evaluación</h3>

        <form
          onSubmit={(e) => { e.preventDefault(); agregarCriterio() }}
          className="rounded-xl border border-white/10 bg-navy-900/70 p-4"
        >
          <p className="mb-3 text-xs font-semibold text-navy-300">Agregar criterio</p>
          <div className="grid gap-3 sm:grid-cols-4">
            <input type="text" placeholder="Etapa" value={fcEtapa} onChange={(e) => setFcEtapa(e.target.value)}
              className="rounded-lg border border-white/10 bg-navy-800 px-3 py-2 text-sm text-white focus:border-gold-500 focus:outline-none" />
            <input type="text" placeholder="Nombre" value={fcNombre} onChange={(e) => setFcNombre(e.target.value)}
              className="rounded-lg border border-white/10 bg-navy-800 px-3 py-2 text-sm text-white focus:border-gold-500 focus:outline-none" />
            <input type="number" placeholder="Puntaje máximo" min={1} step={0.5} value={fcPuntaje} onChange={(e) => setFcPuntaje(e.target.value)}
              className="rounded-lg border border-white/10 bg-navy-800 px-3 py-2 text-sm text-white focus:border-gold-500 focus:outline-none" />
            <input type="number" placeholder="Orden" min={1} value={fcOrden} onChange={(e) => setFcOrden(e.target.value)}
              className="rounded-lg border border-white/10 bg-navy-800 px-3 py-2 text-sm text-white focus:border-gold-500 focus:outline-none" />
          </div>
          <button type="submit" disabled={guardandoCriterio || !fcNombre.trim() || !fcPuntaje || !fcOrden}
            className="btn-primary mt-3 disabled:opacity-50 disabled:cursor-not-allowed">
            {guardandoCriterio ? 'Guardando…' : 'Agregar criterio'}
          </button>
        </form>

        {criterios.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-navy-900/90 text-xs uppercase tracking-wide text-navy-300">
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Etapa</th>
                  <th className="px-4 py-3">Puntaje máximo</th>
                  <th className="px-4 py-3">Orden</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {criterios.map((c) => {
                  const editando = editandoCriterio === c.id
                  return (
                    <tr key={c.id} className="border-b border-white/5 bg-navy-900/70 hover:bg-navy-900">
                      {editando ? (
                        <>
                          <td className="px-4 py-2"><input type="text" value={ecNombre} onChange={(e) => setEcNombre(e.target.value)} className="w-full rounded border border-gold-500/50 bg-navy-800 px-2 py-1 text-white focus:outline-none" /></td>
                          <td className="px-4 py-2 text-navy-300">{c.etapa}</td>
                          <td className="px-4 py-2"><input type="number" min={1} step={0.5} value={ecPuntaje} onChange={(e) => setEcPuntaje(e.target.value)} className="w-full rounded border border-gold-500/50 bg-navy-800 px-2 py-1 text-white focus:outline-none" /></td>
                          <td className="px-4 py-2 text-navy-300">{c.orden}</td>
                          <td className="px-4 py-2 text-right">
                            <button onClick={() => guardarEdicionCriterio(c.id)} className="mr-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300">Guardar</button>
                            <button onClick={() => setEditandoCriterio(null)} className="text-xs text-navy-400 hover:text-white">Cancelar</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 font-medium text-white">{c.nombre}</td>
                          <td className="px-4 py-3 text-navy-200">{c.etapa}</td>
                          <td className="px-4 py-3 text-navy-200">{c.puntaje_maximo}</td>
                          <td className="px-4 py-3 text-navy-200">{c.orden}</td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => iniciarEdicionCriterio(c)} className="text-xs text-navy-300 hover:text-white">Editar</button>
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-navy-600 py-4 text-center text-sm text-navy-400">
            {error ? 'Error al cargar criterios.' : 'Sin criterios para esta etapa. Agrega el primero con el formulario.'}
          </p>
        )}
      </section>

      <div className="mt-10 text-center">
        <Link to="/jurado" className="btn-outline">Ir al Panel del Jurado →</Link>
      </div>
    </>
  )
}
