import { useState } from 'react'
import PanelHeader from '../../components/admin/PanelHeader'
import Section from '../../components/admin/Section'
import { usePanelData } from '../../context/PanelDataContext'
import { getSupabase } from '../../lib/supabase'
import { logConsulta, logError } from '../../utils/devlog'
import { CRITERIOS_OFICIALES } from '../../constants/criteriosOficiales'
import type { Criterio } from '../../types/database'

function FormularioCriterio({
  criterio,
  guardando,
  error,
  onGuardar,
  onCancelar,
}: {
  criterio: Criterio | null
  guardando: boolean
  error: string | null
  onGuardar: (datos: { nombre: string; puntaje_maximo: number; indicadores: string }) => void
  onCancelar: () => void
}) {
  const [nombre, setNombre] = useState(criterio?.nombre ?? '')
  const [puntaje, setPuntaje] = useState(criterio ? String(criterio.puntaje_maximo) : '')
  const [indicadores, setIndicadores] = useState(criterio?.indicadores ?? '')

  const enviar = () => {
    const p = Number(puntaje)
    if (!nombre.trim()) return
    if (!puntaje.trim() || !Number.isFinite(p) || p < 0) return
    onGuardar({ nombre: nombre.trim(), puntaje_maximo: p, indicadores: indicadores.trim() })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancelar} />
      <div className="relative w-full max-w-lg rounded-2xl border border-gold-500/25 bg-gradient-to-b from-navy-800/95 to-navy-950/95 p-6 shadow-2xl shadow-black/60 backdrop-blur">
        <p className="panel-overline text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-300">
          {criterio ? 'Editar criterio' : 'Nuevo criterio'}
        </p>
        <h3 className="mt-2 text-xl font-bold text-white">
          {criterio ? criterio.nombre : 'Agregar a la tabla de puntajes'}
        </h3>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy-400">
              Nombre del criterio
            </label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Porte y elegancia en traje de gala"
              className="input-panel"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy-400">
              Puntaje máximo
            </label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={puntaje}
              onChange={(e) => setPuntaje(e.target.value)}
              placeholder="Ej. 15"
              className="input-panel"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy-400">
              Indicadores / descripción
            </label>
            <textarea
              value={indicadores}
              onChange={(e) => setIndicadores(e.target.value)}
              rows={4}
              placeholder="Aspectos que se evalúan en este criterio…"
              className="input-panel resize-none leading-relaxed"
            />
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onCancelar} className="btn-ghost">
            Cancelar
          </button>
          <button onClick={enviar} disabled={guardando} className="btn-gold">
            {guardando ? 'Guardando…' : criterio ? 'Guardar cambios' : 'Agregar criterio'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Criterios() {
  const { evento, criterios, reglamentos, recargar } = usePanelData()

  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formAbierto, setFormAbierto] = useState(false)
  const [criterioEditar, setCriterioEditar] = useState<Criterio | null>(null)
  const [confirmarEliminar, setConfirmarEliminar] = useState<Criterio | null>(null)

  const etapa = evento?.etapa ?? ''
  const criteriosEtapa = [...criterios.filter((c) => c.etapa === etapa)].sort(
    (a, b) => a.orden - b.orden,
  )
  const oficiales = CRITERIOS_OFICIALES[etapa]
  const reglamento = reglamentos.find((r) => r.etapa === etapa)?.contenido ?? null
  const totalPuntos = criteriosEtapa.reduce((suma, c) => suma + c.puntaje_maximo, 0)

  const abrirNuevo = () => {
    setError(null)
    setCriterioEditar(null)
    setFormAbierto(true)
  }

  const abrirEditar = (c: Criterio) => {
    setError(null)
    setCriterioEditar(c)
    setFormAbierto(true)
  }

  const cerrarForm = () => {
    setFormAbierto(false)
    setCriterioEditar(null)
    setError(null)
  }

  const cargar = async () => {
    if (!etapa || !oficiales) return
    setCargando(true)
    setError(null)
    const supabase = getSupabase()
    logConsulta(`Panel: cargar criterios oficiales para etapa "${etapa}"`)
    const { error } = await supabase.from('criterios').upsert(
      oficiales.map((c, i) => ({
        etapa,
        nombre: c.nombre,
        puntaje_maximo: c.puntaje_maximo,
        indicadores: c.indicadores,
        orden: i + 1,
      })),
      { onConflict: 'etapa,orden' },
    )
    if (error) logError('cargar criterios', error.message)
    setCargando(false)
    await recargar()
  }

  const guardar = async (datos: { nombre: string; puntaje_maximo: number; indicadores: string }) => {
    if (!etapa) return
    setGuardando(true)
    setError(null)
    const supabase = getSupabase()

    if (criterioEditar) {
      logConsulta(`Panel: editar criterio "${criterioEditar.id}"`)
      const { error } = await supabase
        .from('criterios')
        .update({
          nombre: datos.nombre,
          puntaje_maximo: datos.puntaje_maximo,
          indicadores: datos.indicadores,
        })
        .eq('id', criterioEditar.id)
        .eq('etapa', etapa)
      if (error) {
        logError('editar criterio', error.message)
        setError(error.message)
        setGuardando(false)
        return
      }
    } else {
      const orden =
        criteriosEtapa.length > 0 ? Math.max(...criteriosEtapa.map((c) => c.orden)) + 1 : 1
      logConsulta(`Panel: agregar criterio "${datos.nombre}" (orden ${orden})`)
      const { error } = await supabase.from('criterios').insert({
        etapa,
        nombre: datos.nombre,
        puntaje_maximo: datos.puntaje_maximo,
        indicadores: datos.indicadores,
        orden,
      })
      if (error) {
        logError('agregar criterio', error.message)
        setError(error.message)
        setGuardando(false)
        return
      }
    }

    setGuardando(false)
    setFormAbierto(false)
    setCriterioEditar(null)
    await recargar()
  }

  const eliminar = async (c: Criterio) => {
    setGuardando(true)
    setError(null)
    const supabase = getSupabase()
    logConsulta(`Panel: eliminar criterio "${c.id}"`)
    const { error } = await supabase.from('criterios').delete().eq('id', c.id)
    if (error) {
      logError('eliminar criterio', error.message)
      setError(error.message)
      setGuardando(false)
      return
    }
    setGuardando(false)
    setConfirmarEliminar(null)
    await recargar()
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PanelHeader
        eyebrow="Configuración"
        title="Criterios de evaluación"
        description="Administra la rúbrica oficial: agrega, edita o elimina criterios según la etapa del certamen."
      />

      {!etapa ? (
        <p className="rounded-2xl border border-white/10 bg-navy-900/70 p-6 text-sm text-navy-400">
          Primero crea el evento para definir la etapa.
        </p>
      ) : (
        <>
          <Section
            titulo="Rúbrica de la etapa"
            descripcion={`Etapa actual: ${etapa}`}
            completado={criteriosEtapa.length > 0}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-navy-400">
                {criteriosEtapa.length} criterio{criteriosEtapa.length === 1 ? '' : 's'} definidos
                {criteriosEtapa.length > 0 && (
                  <>
                    {' '}·{' '}
                    <span className="font-mono font-semibold text-gold-300">
                      {totalPuntos}
                    </span>{' '}
                    pts en total
                  </>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {oficiales && (
                  <button
                    onClick={cargar}
                    disabled={cargando}
                    title="Reemplaza los criterios con la rúbrica oficial de esta etapa"
                    className="btn-ghost"
                  >
                    {cargando ? 'Cargando…' : 'Cargar oficiales'}
                  </button>
                )}
                <button onClick={abrirNuevo} className="btn-gold">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Nuevo criterio
                </button>
              </div>
            </div>

            {error && (
              <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
            )}

            {criteriosEtapa.length > 0 ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-navy-900/60">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-white/[0.03] text-left text-[10px] uppercase tracking-[0.2em] text-navy-400">
                        <th className="w-14 px-4 py-3 font-semibold">#</th>
                        <th className="px-4 py-3 font-semibold">Criterio</th>
                        <th className="w-24 px-4 py-3 text-center font-semibold">Puntaje</th>
                        <th className="w-28 px-4 py-3 text-right font-semibold">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {criteriosEtapa.map((c, i) => (
                        <tr
                          key={c.id}
                          className={`border-t border-white/[0.07] transition-colors hover:bg-gold-500/[0.04] ${
                            i % 2 === 1 ? 'bg-white/[0.015]' : ''
                          }`}
                        >
                          <td className="px-4 py-3 align-top">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-navy-800/70 font-mono text-xs font-bold text-gold-300 ring-1 ring-gold-500/25">
                              {c.orden}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <p className="font-semibold text-white">{c.nombre}</p>
                            {c.indicadores && (
                              <p className="mt-1 text-xs leading-relaxed text-navy-400">
                                {c.indicadores}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center align-top">
                            <span className="font-mono text-sm font-bold tabular-nums text-gold-300">
                              {c.puntaje_maximo}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right align-top">
                            <div className="inline-flex gap-1.5">
                              <button
                                onClick={() => abrirEditar(c)}
                                title="Editar criterio"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-navy-200 transition hover:border-gold-500/40 hover:text-gold-300"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setConfirmarEliminar(c)}
                                title="Eliminar criterio"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-navy-200 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gold-500/20 bg-white/[0.02]">
                        <td colSpan={2} className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-navy-400">
                          Total rúbrica
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-sm font-bold tabular-nums text-gold-300">
                          {totalPuntos}
                        </td>
                        <td className="px-4 py-3" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-white/15 bg-navy-900/40 p-8 text-center">
                <p className="text-sm text-navy-400">
                  Todavía no hay criterios para esta etapa. Crea el primero con el botón{' '}
                  <span className="font-semibold text-gold-300">Nuevo criterio</span>.
                </p>
              </div>
            )}
          </Section>

          {reglamento && (
            <Section
              titulo={`Reglamento · ${etapa}`}
              descripcion="Disposiciones oficiales de la etapa (cargado desde la base de datos)"
              completado={!!reglamento}
            >
              <div className="whitespace-pre-line rounded-xl border border-white/10 bg-navy-800/40 p-4 text-sm leading-relaxed text-navy-200">
                {reglamento}
              </div>
            </Section>
          )}
        </>
      )}

      {formAbierto && (
        <FormularioCriterio
          criterio={criterioEditar}
          guardando={guardando}
          error={error}
          onGuardar={guardar}
          onCancelar={cerrarForm}
        />
      )}

      {confirmarEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setConfirmarEliminar(null)}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-red-500/25 bg-gradient-to-b from-navy-800/95 to-navy-950/95 p-6 shadow-2xl shadow-black/60 backdrop-blur">
            <p className="panel-overline text-[11px] font-semibold uppercase tracking-[0.25em] text-red-300">
              Eliminar criterio
            </p>
            <h3 className="mt-2 text-xl font-bold text-white">Confirmar eliminación</h3>
            <p className="mt-3 text-sm leading-relaxed text-navy-300">
              Se eliminará{' '}
              <strong className="text-white">"{confirmarEliminar.nombre}"</strong> de la etapa{' '}
              <strong className="text-gold-300">{confirmarEliminar.etapa}</strong>. Las evaluaciones
              ya guardadas con este criterio no se verán afectadas.
            </p>
            {error && (
              <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setConfirmarEliminar(null)} className="btn-ghost">
                Cancelar
              </button>
              <button
                onClick={() => eliminar(confirmarEliminar)}
                disabled={guardando}
                className="btn-danger"
              >
                {guardando ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}