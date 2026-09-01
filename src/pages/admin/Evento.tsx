import { useState } from 'react'
import PanelHeader from '../../components/admin/PanelHeader'
import Section from '../../components/admin/Section'
import { usePanelData } from '../../context/PanelDataContext'
import { getSupabase } from '../../lib/supabase'
import { logConsulta, logError } from '../../utils/devlog'
import { ETAPAS } from '../../constants/criteriosOficiales'
import { EVENT_STATE_LABELS } from '../../constants/eventStates'

export default function Evento() {
  const { evento, recargar } = usePanelData()

  const [nombre, setNombre] = useState('')
  const [etapa, setEtapa] = useState<string>(ETAPAS[0])
  const [editandoNombre, setEditandoNombre] = useState('')
  const [editandoEtapa, setEditandoEtapa] = useState<string>(ETAPAS[0])
  const [modoEdicion, setModoEdicion] = useState(false)
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const crear = async () => {
    if (!nombre.trim()) {
      setError('Ingresa el nombre del evento')
      return
    }
    const supabase = getSupabase()
    logConsulta('Panel: crear evento')
    const { error } = await supabase.from('eventos').insert({
      nombre: nombre.trim(),
      etapa,
      estado: 'preparando',
    })
    if (error) {
      logError('crear evento', error.message)
      setError(error.message)
      return
    }
    setError(null)
    setNombre('')
    await recargar()
  }

  const comenzarEdicion = () => {
    if (!evento) return
    setEditandoNombre(evento.nombre)
    setEditandoEtapa(evento.etapa)
    setModoEdicion(true)
    setError(null)
  }

  const guardarEdicion = async () => {
    if (!evento) return
    if (!editandoNombre.trim()) {
      setError('El nombre no puede estar vacío')
      return
    }
    const supabase = getSupabase()
    logConsulta('Panel: editar evento')
    const { error } = await supabase
      .from('eventos')
      .update({ nombre: editandoNombre.trim(), etapa: editandoEtapa })
      .eq('id', evento.id)
    if (error) {
      logError('editar evento', error.message)
      setError(error.message)
      return
    }
    setError(null)
    setModoEdicion(false)
    await recargar()
  }

  const eliminar = async () => {
    if (!evento) return
    const supabase = getSupabase()
    logConsulta('Panel: eliminar evento')
    // estado_evento no tiene cascade: se limpia a mano antes de borrar el evento.
    try {
      const { error: errEstado } = await supabase
        .from('estado_evento')
        .delete()
        .eq('evento_id', evento.id)
      if (errEstado) logError('eliminar estado_evento', errEstado.message)
    } catch (err) {
      logError('eliminar estado_evento', err instanceof Error ? err.message : String(err))
    }
    try {
      const { error: errEvento } = await supabase.from('eventos').delete().eq('id', evento.id)
      if (errEvento) {
        logError('eliminar evento', errEvento.message)
        setError(errEvento.message)
        return
      }
    } catch (err) {
      logError('eliminar evento', err instanceof Error ? err.message : String(err))
      setError('No se pudo eliminar el evento')
      return
    }
    setConfirmandoEliminar(false)
    setModoEdicion(false)
    setError(null)
    await recargar()
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PanelHeader
        eyebrow="Configuración"
        title="Evento"
        description="Define el nombre y la etapa del certamen. Solo se evalúa un evento a la vez."
      />

      <Section
        titulo="Datos del evento"
        descripcion="Nombre oficial y etapa competitiva"
        completado={!!evento}
      >
        {evento ? (
          !modoEdicion ? (
            <div className="rounded-xl border border-white/10 bg-navy-800/50 px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{evento.nombre}</p>
                  <p className="mt-1 text-sm text-navy-300">
                    Etapa: <span className="text-gold-400">{evento.etapa}</span> · Estado:{' '}
                    <span className="text-gold-400">
                      {EVENT_STATE_LABELS[evento.estado as keyof typeof EVENT_STATE_LABELS] ?? evento.estado}
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={comenzarEdicion}
                    className="rounded-lg bg-gold-500 px-4 py-2 text-xs font-semibold text-navy-900 transition hover:bg-gold-400"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setConfirmandoEliminar(true)}
                    className="rounded-lg border border-red-500/30 px-4 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/10"
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              {confirmandoEliminar && (
                <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                  <p className="text-sm text-red-200">
                    ¿Eliminar el certamen «{evento.nombre}»? Se borrarán las evaluaciones relacionadas
                    (la etapa, candidatas y jurados se conservan).
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={eliminar}
                      className="rounded-lg bg-red-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-400"
                    >
                      Sí, eliminar
                    </button>
                    <button
                      onClick={() => setConfirmandoEliminar(false)}
                      className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-navy-200 transition hover:bg-navy-800"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <input
                placeholder="Nombre del certamen"
                value={editandoNombre}
                onChange={(e) => setEditandoNombre(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-navy-800 px-3 py-2 text-sm text-white placeholder:text-navy-500"
              />
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-navy-400">Etapa:</span>
                {ETAPAS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEditandoEtapa(e)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      editandoEtapa === e
                        ? 'bg-gold-500 text-navy-900'
                        : 'bg-navy-800 text-navy-300 hover:bg-navy-700'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
              {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={guardarEdicion}
                  className="flex-1 rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-navy-900 transition hover:bg-gold-400"
                >
                  Guardar cambios
                </button>
                <button
                  onClick={() => setModoEdicion(false)}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-navy-200 transition hover:bg-navy-800"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="space-y-3">
            <input
              placeholder="Nombre del certamen (ej: Señorita Jiménez Pimentel 2026)"
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
            {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
            <button
              onClick={crear}
              className="w-full rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-navy-900 transition hover:bg-gold-400"
            >
              Crear evento
            </button>
          </div>
        )}
      </Section>
    </div>
  )
}