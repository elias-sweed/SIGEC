import { useState } from 'react'
import PanelHeader from '../../components/admin/PanelHeader'
import Section from '../../components/admin/Section'
import { usePanelData } from '../../context/PanelDataContext'
import { getSupabase } from '../../lib/supabase'
import { logConsulta, logError } from '../../utils/devlog'
import { CRITERIOS_OFICIALES } from '../../constants/criteriosOficiales'
import type { Criterio } from '../../types/database'

const PUNTOS_RUBRICA = 100

function claseEstadoChip(tipo: 'ok' | 'warn' | 'danger' | 'gold'): string {
  const base = 'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold'
  if (tipo === 'ok') return `${base} bg-emerald-500/15 text-emerald-300 shadow-[inset_0_0_0_1px_rgba(110,231,183,0.3)]`
  if (tipo === 'warn') return `${base} bg-amber-500/10 text-amber-300 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.35)]`
  if (tipo === 'danger') return `${base} bg-red-500/10 text-red-300 shadow-[inset_0_0_0_1px_rgba(248,113,113,0.35)]`
  return `${base} bg-gold-500/10 text-gold-300 shadow-[inset_0_0_0_1px_rgba(223,191,98,0.3)]`
}

function FormularioCriterio({
  criterio,
  totalBase,
  guardando,
  error,
  onGuardar,
  onCancelar,
}: {
  criterio: Criterio | null
  totalBase: number
  guardando: boolean
  error: string | null
  onGuardar: (datos: {
    nombre: string
    puntaje_maximo: number
    indicadores: string
    es_desempate: boolean
  }) => void
  onCancelar: () => void
}) {
  const [nombre, setNombre] = useState(criterio?.nombre ?? '')
  const [puntaje, setPuntaje] = useState(criterio ? String(criterio.puntaje_maximo) : '')
  const [indicadores, setIndicadores] = useState(criterio?.indicadores ?? '')
  const [esDesempate, setEsDesempate] = useState(criterio?.es_desempate ?? false)

  const p = Number(puntaje)
  const puntosValidos = puntaje.trim() !== '' && Number.isFinite(p) && p >= 0

  const baseSin =
    totalBase - (criterio && !criterio.es_desempate ? criterio.puntaje_maximo : 0)

  const previewBase = esDesempate ? baseSin : baseSin + (puntosValidos ? p : 0)
  const previewEstado =
    previewBase === PUNTOS_RUBRICA
      ? 'ok'
      : previewBase > PUNTOS_RUBRICA
        ? 'danger'
        : 'warn'

  const enviar = () => {
    if (!nombre.trim()) return
    if (!puntosValidos) return
    onGuardar({
      nombre: nombre.trim(),
      puntaje_maximo: p,
      indicadores: indicadores.trim(),
      es_desempate: esDesempate,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancelar} />
      <div className="relative w-full max-w-lg rounded-2xl border border-gold-500/25 bg-gradient-to-b from-navy-800/95 to-navy-950/95 p-6 shadow-2xl shadow-black/60 backdrop-blur">
        <p className="panel-overline text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-300">
          {criterio ? 'Editar criterio' : 'Nuevo criterio'}
        </p>
        <h3 className="mt-2 text-xl font-bold text-white">
          {criterio ? criterio.nombre : 'Agregar a la rúbrica'}
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

          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-navy-800/40 px-3.5 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-navy-400">
                Criterio de desempate
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-navy-500">
                No cuenta dentro de los {PUNTOS_RUBRICA} pts: sus puntos van aparte y se usan solo
                para romper empates.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={esDesempate}
              onClick={() => setEsDesempate((v) => !v)}
              className={`h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors ${
                esDesempate ? 'bg-gold-500/70' : 'bg-navy-600/60'
              }`}
            >
              <span
                className={`block h-5 w-5 rounded-full transition-transform ${
                  esDesempate ? 'translate-x-5 bg-gold-300' : 'translate-x-0 bg-navy-300'
                }`}
              />
            </button>
          </div>

          <div
            className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-sm ${
              previewEstado === 'ok'
                ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300'
                : previewEstado === 'danger'
                  ? 'border-red-500/30 bg-red-500/5 text-red-300'
                  : 'border-amber-500/30 bg-amber-500/5 text-amber-300'
            }`}
          >
            <span className="font-semibold">
              {previewEstado === 'ok'
                ? 'Queda en 100 pts — rúbrica cerrada'
                : previewEstado === 'warn'
                  ? `Faltan ${PUNTOS_RUBRICA - previewBase} pts para completar la rúbrica`
                  : `Sobran ${previewBase - PUNTOS_RUBRICA} pts sobre la rúbrica`}
            </span>
            <span className="font-mono font-bold tabular-nums">
              {previewBase}
              <span className="opacity-60">/100</span>
            </span>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onCancelar} className="btn-ghost">
            Cancelar
          </button>
          <button
            onClick={enviar}
            disabled={guardando || !nombre.trim() || !puntosValidos}
            className="btn-gold"
          >
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
  const criteriosBase = criteriosEtapa.filter((c) => !c.es_desempate)
  const criteriosDesempate = criteriosEtapa.filter((c) => c.es_desempate)
  const totalBase = criteriosBase.reduce((suma, c) => suma + c.puntaje_maximo, 0)
  const totalDesempate = criteriosDesempate.reduce((suma, c) => suma + c.puntaje_maximo, 0)
  const oficiales = CRITERIOS_OFICIALES[etapa]
  const reglamento = reglamentos.find((r) => r.etapa === etapa)?.contenido ?? null

  const estadoTexto =
    totalBase === PUNTOS_RUBRICA
      ? 'Rúbrica completa · 100 pts'
      : totalBase < PUNTOS_RUBRICA
        ? `Faltan ${PUNTOS_RUBRICA - totalBase} pts · va ${totalBase}/100`
        : `Sobran ${totalBase - PUNTOS_RUBRICA} pts · va ${totalBase}/100`

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

  const guardar = async (datos: {
    nombre: string
    puntaje_maximo: number
    indicadores: string
    es_desempate: boolean
  }) => {
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
          es_desempate: datos.es_desempate,
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
        es_desempate: datos.es_desempate,
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

  const alternarDesempate = async (c: Criterio) => {
    setGuardando(true)
    setError(null)
    const supabase = getSupabase()
    logConsulta(`Panel: marcar criterio "${c.id}" como desempate=${!c.es_desempate}`)
    const { error } = await supabase
      .from('criterios')
      .update({ es_desempate: !c.es_desempate })
      .eq('id', c.id)
    if (error) {
      logError('marcar desempate', error.message)
      setError(error.message)
      setGuardando(false)
      return
    }
    setGuardando(false)
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
        description="Administra la rúbrica oficial: agrega, edita o elimina criterios. Los criterios de desempate no cuentan dentro de los 100 pts."
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
              <div className="flex flex-wrap items-center gap-2">
                <span className={claseEstadoChip(totalBase === 100 ? 'ok' : totalBase < 100 ? 'warn' : 'danger')}>
                  {estadoTexto}
                </span>
                {totalDesempate > 0 && (
                  <span className={claseEstadoChip('gold')}>Desempate +{totalDesempate} pts</span>
                )}
              </div>
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

            <p className="mt-2 text-xs text-navy-400">
              {criteriosEtapa.length} criterio{criteriosEtapa.length === 1 ? '' : 's'} en total ·{' '}
              {criteriosBase.length} en rubrica ·{' '}
              {criteriosDesempate.length} de desempate
            </p>

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
                        <th className="w-40 px-4 py-3 text-right font-semibold">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {criteriosEtapa.map((c, i) => (
                        <tr
                          key={c.id}
                          className={`border-t transition-colors hover:bg-gold-500/[0.04] ${
                            c.es_desempate ? 'border-gold-500/20 bg-gold-500/[0.04]' : 'border-white/[0.07]'
                          } ${i % 2 === 1 ? 'bg-white/[0.015]' : ''}`}
                        >
                          <td className="px-4 py-3 align-top">
                            <span
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-lg font-mono text-xs font-bold ring-1 ${
                                c.es_desempate
                                  ? 'bg-gold-500/10 text-gold-300 ring-gold-500/30'
                                  : 'bg-navy-800/70 text-gold-300 ring-gold-500/25'
                              }`}
                            >
                              {c.orden}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-white">{c.nombre}</p>
                              {c.es_desempate && (
                                <span className={claseEstadoChip('gold')}>Desempate</span>
                              )}
                            </div>
                            {c.indicadores && (
                              <p className="mt-1 text-xs leading-relaxed text-navy-400">
                                {c.indicadores}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center align-top">
                            <span
                              className={`font-mono text-sm font-bold tabular-nums ${
                                c.es_desempate ? 'text-gold-300' : 'text-gold-300'
                              }`}
                            >
                              {c.puntaje_maximo}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right align-top">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => alternarDesempate(c)}
                                disabled={guardando}
                                title={
                                  c.es_desempate
                                    ? 'Quitar de desempate (cuenta en la rúbrica)'
                                    : 'Marcar como desempate (no cuenta en los 100 pts)'
                                }
                                className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${
                                  c.es_desempate
                                    ? 'border-gold-500/40 bg-gold-500/10 text-gold-300 hover:bg-gold-500/20 disabled:opacity-40'
                                    : 'border-white/10 bg-white/[0.03] text-navy-300 hover:border-gold-500/30 hover:text-gold-300 disabled:opacity-40'
                                }`}
                              >
                                Desempate
                              </button>
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
                        <td colSpan={2} className="px-4 py-3">
                          <span className="text-xs font-semibold uppercase tracking-widest text-navy-400">
                            Total rúbrica
                          </span>
                          {totalDesempate > 0 && (
                            <span className="ml-2 text-[11px] font-semibold text-gold-300">
                              +{totalDesempate} pts desempate
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-sm font-bold tabular-nums text-gold-300">
                          {totalBase}
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
          totalBase={totalBase}
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
              <strong className="text-gold-300">{confirmarEliminar.etapa}</strong>{' '}
              {confirmarEliminar.es_desempate && (
                <span className="text-gold-300">(criterio de desempate)</span>
              )}
              . Las evaluaciones ya guardadas con este criterio no se verán afectadas.
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