import { useMemo, useState } from 'react'
import PanelHeader from '../../components/admin/PanelHeader'
import Section from '../../components/admin/Section'
import { IconoCheck, IconoLapiz, IconoPapelera } from '../../components/admin/Iconos'
import { usePanelData } from '../../context/PanelDataContext'
import { getSupabase } from '../../lib/supabase'
import { logConsulta, logError } from '../../utils/devlog'
import type { Candidata } from '../../types/database'

const GRADOS = ['1', '2', '3', '4', '5']
const SECCIONES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']

function valido(grado: string, seccion: string): boolean {
  return GRADOS.includes(grado) && SECCIONES.includes(seccion)
}

export default function Candidatas() {
  const { candidatas, cargandoInicial, recargar } = usePanelData()

  const [nombre, setNombre] = useState('')
  const [grado, setGrado] = useState(GRADOS[0])
  const [seccion, setSeccion] = useState(SECCIONES[0])
  const [filtroGrado, setFiltroGrado] = useState('')
  const [filtroSeccion, setFiltroSeccion] = useState('')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editando, setEditando] = useState({ nombre: '', grado: GRADOS[0], seccion: SECCIONES[0] })
  const [error, setError] = useState<string | null>(null)

  // Orden global estable: grado (numérico) → sección → nombre
  const ordenGlobal = useMemo(
    () =>
      [...candidatas].sort((a, b) => {
        const gA = parseInt(a.grado, 10) || 0
        const gB = parseInt(b.grado, 10) || 0
        if (gA !== gB) return gA - gB
        if (a.seccion !== b.seccion) return a.seccion.localeCompare(b.seccion)
        return a.nombre.localeCompare(b.nombre, 'es')
      }),
    [candidatas],
  )

  // Número fijo (1..N) según el orden global, para que no cambie con los filtros
  const numeroPorId = useMemo(() => {
    const map = new Map<string, number>()
    ordenGlobal.forEach((c, i) => map.set(c.id, i + 1))
    return map
  }, [ordenGlobal])

  const listado = useMemo(() => {
    if (!filtroGrado && !filtroSeccion) return ordenGlobal
    return ordenGlobal.filter(
      (c) => (!filtroGrado || c.grado === filtroGrado) && (!filtroSeccion || c.seccion === filtroSeccion),
    )
  }, [ordenGlobal, filtroGrado, filtroSeccion])

  const comenzarEdicion = (c: Candidata) => {
    setEditandoId(c.id)
    setEditando({ nombre: c.nombre, grado: c.grado, seccion: c.seccion })
  }

  const guardarEdicion = async (id: string) => {
    const nombreOk = editando.nombre.trim()
    if (!nombreOk) {
      setError('El nombre es obligatorio')
      return
    }
    if (!valido(editando.grado, editando.seccion)) {
      setError('Selecciona un grado (1-5) y una sección (A-I) válidos')
      return
    }
    const supabase = getSupabase()
    const { error } = await supabase
      .from('candidatas')
      .update({ nombre: nombreOk, grado: editando.grado, seccion: editando.seccion })
      .eq('id', id)
    if (error) {
      setError(error.message)
      return
    }
    setEditandoId(null)
    setError(null)
    await recargar()
  }

  const agregar = async () => {
    const nombreOk = nombre.trim()
    if (!nombreOk) {
      setError('El nombre es obligatorio')
      return
    }
    if (!valido(grado, seccion)) {
      setError('Selecciona un grado (1-5) y una sección (A-I) válidos')
      return
    }
    const supabase = getSupabase()
    logConsulta('Panel: agregar candidata')
    const { error } = await supabase.from('candidatas').insert({
      nombre: nombreOk,
      grado,
      seccion,
    })
    if (error) {
      logError('agregar candidata', error.message)
      setError(error.message)
      return
    }
    setNombre('')
    setError(null)
    await recargar()
  }

  const eliminar = async (id: string) => {
    const supabase = getSupabase()
    const { error } = await supabase.from('candidatas').delete().eq('id', id)
    if (error) {
      setError(error.message)
      return
    }
    setError(null)
    await recargar()
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PanelHeader
        eyebrow="Configuración"
        title="Candidatas"
        description={`${candidatas.length} participantes registradas. Ordenadas por grado y sección, con numeración del 1 al ${candidatas.length}.`}
      />

      <Section
        titulo="Registro de candidatas"
        descripcion="Nombre completo, grado (1-5) y sección (A-I)"
        completado={candidatas.length > 0}
      >
        {error && <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_110px_110px]">
          <input
            placeholder="Nombre completo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="input-panel"
          />
          <select
            value={grado}
            onChange={(e) => setGrado(e.target.value)}
            className="input-panel"
            title="Grado"
          >
            {GRADOS.map((g) => (
              <option key={g} value={g}>
                {g}° grado
              </option>
            ))}
          </select>
          <select
            value={seccion}
            onChange={(e) => setSeccion(e.target.value)}
            className="input-panel"
            title="Sección"
          >
            {SECCIONES.map((s) => (
              <option key={s} value={s}>
                Sección {s}
              </option>
            ))}
          </select>
        </div>
        <button onClick={agregar} className="btn-gold mt-3 w-full">
          Agregar candidata
        </button>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-navy-400">
            Filtrar
          </p>
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
        </div>

        {cargandoInicial ? (
          <div className="mt-4 space-y-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="fila-panel">
                <div className="h-3 w-8 rounded skeleton bg-white/10" />
                <div className="h-3 flex-1 skeleton bg-white/10" />
                <div className="h-8 w-8 rounded-lg skeleton bg-white/10" />
                <div className="h-8 w-8 rounded-lg skeleton bg-white/10" />
              </div>
            ))}
          </div>
        ) : listado.length > 0 ? (
          <ul className="mt-4 max-h-80 space-y-1.5 overflow-y-auto">
            {listado.map((c) => (
              <li key={c.id} className="fila-panel text-sm">
                <span className="grid h-7 w-9 shrink-0 place-items-center rounded-lg bg-gold-500/15 font-mono text-xs font-bold text-gold-300 ring-1 ring-gold-500/25">
                  {numeroPorId.get(c.id)}
                </span>
                {editandoId === c.id ? (
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <input
                      value={editando.nombre}
                      onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
                      className="flex-1 rounded-lg border border-gold-500/40 bg-navy-800 px-2 py-1 text-sm text-white"
                    />
                    <select
                      value={editando.grado}
                      onChange={(e) => setEditando({ ...editando, grado: e.target.value })}
                      className="w-20 rounded-lg border border-gold-500/40 bg-navy-800 px-1 py-1 text-sm text-white"
                    >
                      {GRADOS.map((g) => (
                        <option key={g} value={g}>
                          {g}°
                        </option>
                      ))}
                    </select>
                    <select
                      value={editando.seccion}
                      onChange={(e) => setEditando({ ...editando, seccion: e.target.value })}
                      className="w-20 rounded-lg border border-gold-500/40 bg-navy-800 px-1 py-1 text-sm text-white"
                    >
                      {SECCIONES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => guardarEdicion(c.id)}
                      title="Guardar"
                      aria-label="Guardar"
                      className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/15 text-emerald-400 transition hover:bg-emerald-500/25"
                    >
                      <IconoCheck />
                    </button>
                  </div>
                ) : (
                  <span className="min-w-0 flex-1 truncate text-white">
                    <span className="font-semibold">{c.nombre}</span>
                    <span className="text-navy-400">
                      {' '}· {c.grado}° · Sección {c.seccion}
                    </span>
                  </span>
                )}
                <div className="flex shrink-0 items-center gap-1.5">
                  {editandoId !== c.id && (
                    <button
                      onClick={() => comenzarEdicion(c)}
                      title="Editar candidata"
                      aria-label="Editar candidata"
                      className="grid h-8 w-8 place-items-center rounded-lg bg-gold-500/10 text-gold-400 transition hover:bg-gold-500/25"
                    >
                      <IconoLapiz />
                    </button>
                  )}
                  <button
                    onClick={() => eliminar(c.id)}
                    title="Eliminar candidata"
                    aria-label="Eliminar candidata"
                    className="grid h-8 w-8 place-items-center rounded-lg bg-red-500/10 text-red-400 transition hover:bg-red-500/25"
                  >
                    <IconoPapelera />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-navy-400/80">Sin candidatas registradas todavía.</p>
        )}
      </Section>
    </div>
  )
}
