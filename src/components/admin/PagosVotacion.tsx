import { useCallback, useEffect, useState } from 'react'
import { usePanelData } from '../../context/PanelDataContext'
import {
  actualizarConfigVotacion,
  aprobarPagoYape,
  consultarConfiguracion,
  listarPagosVotacion,
  rechazarPagoYape,
  type ConfigVotacion,
  type PagoConVotante,
} from '../../services/votacion.service'
import { registrarAccion } from '../../utils/auditLog'
import { logError } from '../../utils/devlog'

function fechaCorta(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

const ESTADO_CHIP: Record<PagoConVotante['estado'], string> = {
  pendiente: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/30',
  verificado: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30',
  rechazado: 'bg-red-500/15 text-red-300 ring-1 ring-red-400/30',
}

export default function PagosVotacion() {
  const { evento } = usePanelData()
  const eventoId = evento?.id ?? null

  const [config, setConfig] = useState<ConfigVotacion | null>(null)
  const [pagos, setPagos] = useState<PagoConVotante[]>([])
  const [cargando, setCargando] = useState(true)
  const [operando, setOperando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<'todos' | 'pendiente' | 'verificado' | 'rechazado'>('todos')

  const cargar = useCallback(async () => {
    if (!eventoId) {
      setCargando(false)
      return
    }
    setCargando(true)
    setError(null)
    try {
      const [cfg, lista] = await Promise.all([
        consultarConfiguracion(eventoId),
        listarPagosVotacion(eventoId),
      ])
      setConfig(cfg)
      setPagos(lista)
    } catch (err) {
      logError('PagosVotacion.cargar', err instanceof Error ? err.message : String(err))
      setError('No se pudieron cargar los pagos de votación.')
    } finally {
      setCargando(false)
    }
  }, [eventoId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const cambiarConfig = async (cambios: Partial<ConfigVotacion>) => {
    if (!eventoId) return
    setOperando('config')
    setError(null)
    try {
      await actualizarConfigVotacion(eventoId, cambios)
      await cargar()
      await registrarAccion(
        'Operador',
        'votacion_config',
        `Configuración de votación actualizada: ${JSON.stringify(cambios)}`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setOperando(null)
    }
  }

  const resolverPago = async (pago: PagoConVotante, accion: 'aprobar' | 'rechazar') => {
    setOperando(pago.id)
    setError(null)
    try {
      if (accion === 'aprobar') await aprobarPagoYape(pago.id)
      else await rechazarPagoYape(pago.id)
      await cargar()
      await registrarAccion(
        'Operador',
        `pago_${accion}`,
        `Pago Yape ${pago.numero_operacion} (${pago.votantes?.email ?? '—'}) ${accion === 'aprobar' ? 'aprobado' : 'rechazado'}`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setOperando(null)
    }
  }

  const visibles = filtro === 'todos' ? pagos : pagos.filter((p) => p.estado === filtro)
  const conteo = {
    pendiente: pagos.filter((p) => p.estado === 'pendiente').length,
    verificado: pagos.filter((p) => p.estado === 'verificado').length,
    rechazado: pagos.filter((p) => p.estado === 'rechazado').length,
  }
  const recaudado = pagos
    .filter((p) => p.estado === 'verificado')
    .reduce((s, p) => s + Number(p.monto), 0)

  if (!eventoId) return null

  return (
    <section className="panel-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold-300">
            Votación pública
          </p>
          <h3 className="mt-1 text-base font-semibold text-white">Pagos Yape y votos extra</h3>
          <p className="mt-0.5 text-xs text-navy-300/80">
            Primer voto gratis por dispositivo; los votos adicionales se pagan con Yape. Aquí
            monitoreas y verificas los pagos.
          </p>
        </div>
        <button onClick={() => void cargar()} disabled={cargando} className="btn-ghost shrink-0">
          {cargando ? 'Cargando…' : 'Refrescar'}
        </button>
      </div>

      {error && <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>}

      {/* Controles de configuración */}
      {config && (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <button
            onClick={() => void cambiarConfig({ habilitada: !config.habilitada })}
            disabled={operando === 'config'}
            className={`rounded-2xl border px-4 py-3 text-left transition disabled:opacity-50 ${
              config.habilitada
                ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200'
                : 'border-white/10 bg-navy-800/40 text-navy-200 hover:text-white'
            }`}
          >
            <p className="text-sm font-bold">{config.habilitada ? '◉ Votación ACTIVA' : '○ Votación desactivada'}</p>
            <p className="mt-0.5 text-xs opacity-75">Toca para {config.habilitada ? 'desactivar' : 'activar'}</p>
          </button>

          <button
            onClick={() => void cambiarConfig({ auto_verificar_pagos: !config.auto_verificar_pagos })}
            disabled={operando === 'config'}
            className={`rounded-2xl border px-4 py-3 text-left transition disabled:opacity-50 ${
              config.auto_verificar_pagos
                ? 'border-sky-400/60 bg-sky-500/15 text-sky-200'
                : 'border-amber-400/60 bg-amber-500/15 text-amber-200'
            }`}
          >
            <p className="text-sm font-bold">
              {config.auto_verificar_pagos ? '⚡ Auto-verificación' : '🔎 Verificación manual'}
            </p>
            <p className="mt-0.5 text-xs opacity-75">
              {config.auto_verificar_pagos
                ? 'Los Yapes dan voto al instante'
                : 'Los pagos quedan pendientes de revisión'}
            </p>
          </button>

          <div className="rounded-2xl border border-gold-500/30 bg-navy-800/40 px-4 py-3">
            <p className="text-sm font-bold text-gold-300">S/ {Number(config.monto_por_pago).toFixed(2)}</p>
            <p className="mt-0.5 text-xs text-navy-300/80">
              {config.votos_por_pago} voto{config.votos_por_pago === 1 ? '' : 's'} por pago
            </p>
          </div>
        </div>
      )}

      {/* Resumen */}
      <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
        <span className="chip chip-muted">Pendientes: {conteo.pendiente}</span>
        <span className="chip chip-ok">Verificados: {conteo.verificado}</span>
        <span className="chip chip-muted">Rechazados: {conteo.rechazado}</span>
        <span className="chip chip-gold">Recaudado: S/ {recaudado.toFixed(2)}</span>

        <div className="ml-auto flex gap-1">
          {(['todos', 'pendiente', 'verificado', 'rechazado'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`rounded-lg px-2.5 py-1 font-semibold capitalize transition ${
                filtro === f ? 'bg-gold-500 text-navy-900' : 'bg-navy-800/60 text-navy-200 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {cargando ? (
        <p className="mt-4 text-sm text-navy-400">Cargando pagos…</p>
      ) : visibles.length === 0 ? (
        <p className="mt-4 text-sm text-navy-400/80">
          {pagos.length === 0
            ? 'Aún no se registró ningún pago Yape en este evento.'
            : 'No hay pagos con ese filtro.'}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-widest text-navy-400">
                <th className="pb-2 pr-3 font-semibold">Fecha</th>
                <th className="pb-2 pr-3 font-semibold">Votante</th>
                <th className="pb-2 pr-3 font-semibold">Operación</th>
                <th className="pb-2 pr-3 text-center font-semibold">Monto</th>
                <th className="pb-2 pr-3 text-center font-semibold">Estado</th>
                <th className="pb-2 text-right font-semibold">Acción</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((p) => (
                <tr key={p.id} className="border-t border-white/10 transition-colors hover:bg-white/3">
                  <td className="py-3 pr-3 font-mono text-xs text-navy-300">{fechaCorta(p.created_at)}</td>
                  <td className="max-w-[180px] truncate py-3 pr-3 text-white">
                    {p.votantes?.email ?? '—'}
                  </td>
                  <td className="py-3 pr-3 font-mono text-xs text-navy-200">{p.numero_operacion}</td>
                  <td className="py-3 pr-3 text-center font-mono tabular-nums text-gold-300">
                    S/ {Number(p.monto).toFixed(2)}
                  </td>
                  <td className="py-3 pr-3 text-center">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${ESTADO_CHIP[p.estado]}`}>
                      {p.estado}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    {p.estado === 'verificado' ? (
                      <button
                        onClick={() => void resolverPago(p, 'rechazar')}
                        disabled={operando === p.id}
                        className="rounded-lg border border-red-400/40 px-3 py-1.5 text-xs font-bold text-red-300 transition hover:bg-red-500/15 disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                    ) : (
                      <button
                        onClick={() => void resolverPago(p, 'aprobar')}
                        disabled={operando === p.id}
                        className="rounded-lg border border-emerald-400/40 px-3 py-1.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/15 disabled:opacity-50"
                      >
                        Aprobar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-[11px] text-navy-400">
        Con auto-verificación activa, cada número de operación Yape válido otorga el voto al
        instante. Desactívala para revisar cada pago manualmente antes de otorgar los votos.
      </p>
    </section>
  )
}
