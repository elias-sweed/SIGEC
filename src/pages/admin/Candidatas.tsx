import { useState } from 'react'
import PanelHeader from '../../components/admin/PanelHeader'
import Section from '../../components/admin/Section'
import { IconoCheck, IconoLapiz, IconoPapelera } from '../../components/admin/Iconos'
import { usePanelData } from '../../context/PanelDataContext'
import { getSupabase } from '../../lib/supabase'
import { logConsulta, logError } from '../../utils/devlog'
import type { Candidata } from '../../types/database'

export default function Candidatas() {
  const { candidatas, cargandoInicial, recargar } = usePanelData()

  const [nombre, setNombre] = useState('')
  const [grado, setGrado] = useState('')
  const [seccion, setSeccion] = useState('')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editando, setEditando] = useState({ nombre: '', grado: '', seccion: '' })
  const [error, setError] = useState<string | null>(null)

  const comenzarEdicion = (c: Candidata) => {
    setEditandoId(c.id)
    setEditando({ nombre: c.nombre, grado: c.grado, seccion: c.seccion })
  }

  const guardarEdicion = async (id: string) => {
    if (!editando.nombre.trim() || !editando.grado.trim() || !editando.seccion.trim()) {
      setError('Todos los campos son obligatorios')
      return
    }
    const supabase = getSupabase()
    const { error } = await supabase
      .from('candidatas')
      .update({
        nombre: editando.nombre.trim(),
        grado: editando.grado.trim(),
        seccion: editando.seccion.trim(),
      })
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
    if (!nombre.trim() || !grado.trim() || !seccion.trim()) {
      setError('Todos los campos son obligatorios')
      return
    }
    const supabase = getSupabase()
    logConsulta('Panel: agregar candidata')
    const { error } = await supabase.from('candidatas').insert({
      nombre: nombre.trim(),
      grado: grado.trim(),
      seccion: seccion.trim(),
    })
    if (error) {
      logError('agregar candidata', error.message)
      setError(error.message)
      return
    }
    setNombre('')
    setGrado('')
    setSeccion('')
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
        description="Registra a las participantes del certamen. Cada candidata será evaluada por el jurado."
      />

      <Section
        titulo="Registro de candidatas"
        descripcion="Nombre, grado y sección"
        completado={candidatas.length > 0}
      >
        {error && <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
        <div className="grid grid-cols-[1fr_90px_90px] gap-2">
          <input
            placeholder="Nombre completo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="input-panel"
          />
          <input
            placeholder="Grado"
            value={grado}
            onChange={(e) => setGrado(e.target.value)}
            className="input-panel"
          />
          <input
            placeholder="Sección"
            value={seccion}
            onChange={(e) => setSeccion(e.target.value)}
            className="input-panel"
          />
        </div>
        <button
          onClick={agregar}
          className="btn-gold mt-3 w-full"
        >
          Agregar candidata
        </button>

        {cargandoInicial ? (
          <div className="mt-4 space-y-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="fila-panel">
                <div className="h-3 flex-1 skeleton bg-white/10" />
                <div className="h-8 w-8 rounded-lg skeleton bg-white/10" />
                <div className="h-8 w-8 rounded-lg skeleton bg-white/10" />
              </div>
            ))}
          </div>
        ) : (
          candidatas.length > 0 && (
            <ul className="mt-4 max-h-80 space-y-1.5 overflow-y-auto">
            {candidatas.map((c) => (
              <li
                key={c.id}
                className="fila-panel text-sm"
              >
                {editandoId === c.id ? (
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <input
                      value={editando.nombre}
                      onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
                      className="flex-1 rounded-lg border border-gold-500/40 bg-navy-800 px-2 py-1 text-sm text-white"
                    />
                    <input
                      value={editando.grado}
                      onChange={(e) => setEditando({ ...editando, grado: e.target.value })}
                      className="w-16 rounded-lg border border-gold-500/40 bg-navy-800 px-2 py-1 text-sm text-white"
                    />
                    <input
                      value={editando.seccion}
                      onChange={(e) => setEditando({ ...editando, seccion: e.target.value })}
                      className="w-16 rounded-lg border border-gold-500/40 bg-navy-800 px-2 py-1 text-sm text-white"
                    />
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
                  <span className="truncate text-white">
                    <span className="font-semibold">{c.nombre}</span>
                    <span className="text-navy-400">
                      {' '}
                      · {c.grado} · {c.seccion}
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
          )
        )}
      </Section>
    </div>
  )
}