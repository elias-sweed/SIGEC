import { useState } from 'react'
import PanelHeader from '../../components/admin/PanelHeader'
import Section from '../../components/admin/Section'
import { SectionSkeleton } from '../../components/Skeleton'
import { usePanelData } from '../../context/PanelDataContext'
import { getSupabase } from '../../lib/supabase'
import { logConsulta, logError } from '../../utils/devlog'
import { ETAPAS } from '../../constants/criteriosOficiales'
import { EVENT_STATE_LABELS } from '../../constants/eventStates'

function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function Evento() {
  const { eventos, evento, cargandoInicial, recargar, seleccionarEvento } = usePanelData()

  const [nombre, setNombre] = useState('')
  const [etapa, setEtapa] = useState<string>(ETAPAS[0])
  const [editandoNombre, setEditandoNombre] = useState('')
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
    const { data: nuevo, error } = await supabase
      .from('eventos')
      .insert({
        nombre: nombre.trim(),
        etapa,
        estado: 'preparando',
      })
      .select('id')
      .single()
    if (error) {
      logError('crear evento', error.message)
      setError(error.message)
      return
    }
    setError(null)
    setNombre('')
    // Al crear, se abre el nuevo evento: aparece todo en blanco y lo del
    // evento anterior queda guardado intacto.
    if (nuevo) await seleccionarEvento(nuevo.id)
  }

  const comenzarEdicion = () => {
    if (!evento) return
    setEditandoNombre(evento.nombre)
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
    // Solo se edita el nombre: la etapa queda fija (selección única).
    const { error } = await supabase
      .from('eventos')
      .update({ nombre: editandoNombre.trim() })
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
        description="Crea y alterna entre las etapas del certamen. Cada evento guarda sus propias evaluaciones y resultados: al volver a uno anterior se recupera toda su información y las nuevas etapas inician en blanco."
      />

      {cargandoInicial ? (
        <SectionSkeleton rows={3} />
      ) : (
        <>
          {/* Selector: cambiar de evento sin perder datos */}
          <Section
            titulo="Selector de evento"
            descripcion="Cambia entre etapas. Cada evento conserva sus evaluaciones, progreso y resultados."
            completado={eventos.length > 0}
          >
            {eventos.length === 0 ? (
              <p className="text-sm text-navy-400/80">
                Aún no hay eventos. Crea el primero con el formulario de abajo.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {eventos.map((e) => {
                  const activo = e.id === evento?.id
                  const estadoLabel =
                    EVENT_STATE_LABELS[e.estado as keyof typeof EVENT_STATE_LABELS] ?? e.estado
                  return (
                    <button
                      key={e.id}
                      onClick={() => void seleccionarEvento(e.id)}
                      className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200 ${
                        activo
                          ? 'border-gold-500/60 bg-gold-500/10 ring-2 ring-gold-400/40'
                          : 'border-white/10 bg-navy-800/40 hover:border-white/25 hover:bg-navy-800/70'
                      }`}
                    >
                      <span
                        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors ${
                          activo ? 'border-gold-400' : 'border-navy-600'
                        }`}
                      >
                        {activo && <span className="h-2.5 w-2.5 rounded-full bg-gold-400" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className={`text-sm font-bold ${activo ? 'text-gold-200' : 'text-white'}`}>
                            {e.nombre}
                          </span>
                          {activo && (
                            <span className="shrink-0 rounded-full bg-gold-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-navy-950">
                              Activo
                            </span>
                          )}
                        </span>
                        <span className="mt-1.5 block text-xs text-navy-300">
                          <span className="text-gold-400">{e.etapa}</span> · {estadoLabel}
                        </span>
                        <span className="mt-1 block text-[11px] text-navy-500">
                          Creado el {fechaCorta(e.created_at)}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </Section>

          {/* Datos del evento activo (editar / eliminar) */}
          <Section
            titulo="Datos del evento activo"
            descripcion={evento ? `Estás operando «${evento.nombre}»` : 'Aún no hay un evento activo'}
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
                      <p className="mt-0.5 text-xs text-navy-500">
                        Creado el {fechaCorta(evento.created_at)}
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
                        ¿Eliminar el certamen «{evento.nombre}»? Se borrarán las evaluaciones
                        relacionadas (la etapa, candidatas y jurados se conservan).
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
                    className="input-panel"
                  />
                  <p className="text-xs text-navy-300">
                    Etapa: <span className="font-semibold text-gold-400">{evento.etapa}</span>
                  </p>
                  {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
                  <div className="flex gap-2">
                    <button onClick={guardarEdicion} className="btn-gold flex-1">
                      Guardar cambios
                    </button>
                    <button onClick={() => setModoEdicion(false)} className="btn-ghost">
                      Cancelar
                    </button>
                  </div>
                </div>
              )
            ) : (
              <p className="text-sm text-navy-400/80">
                Selecciona un evento de arriba o crea uno nuevo abajo.
              </p>
            )}
          </Section>

          {/* Nuevo evento: la siguiente etapa inicia limpiando todo */}
          <Section
            titulo="Nuevo evento"
            descripcion="Crea la siguiente etapa del certamen (ej: la final). Inicia en blanco sin tocar los datos de las etapas anteriores."
            completado={false}
          >
            <div className="space-y-3">
              <input
                placeholder="Nombre del certamen (ej: Señorita Jiménez Pimentel 2026)"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="input-panel"
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
              <button onClick={crear} className="btn-gold w-full">
                Crear evento
              </button>
            </div>
          </Section>
        </>
      )}
    </div>
  )
}