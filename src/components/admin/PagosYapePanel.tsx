import { useCallback, useEffect, useState } from 'react'
import { getSupabase } from '../../lib/supabase'
import {
  consultarConfiguracion,
  type ConfigVotacion,
  type PagoYape,
  type Votante,
} from '../../services/votacion.service'
import { logError } from '../../utils/devlog'
import { registrarAccion } from '../../utils/auditLog'

interface PagosYapePanelProps {
  eventoId: string | null
}

function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/**
 * Verificación manual de los pagos Yape de la votación pública.
 * El votante Yapea EXACTAMENTE el monto configurado y registra el número de
 * operación; aquí el administrador comprueba el abono (monto exacto) en su
 * celular y lo marca verificado para liberar los votos pagados, o lo rechaza.
 */
export default function PagosYapePanel({ eventoId }: PagosYapePanelProps) {
  const [pagos, setPagos] = useState<PagoYape[]>([])
  const [votantes, setVotantes] = useState<Record<string, Votante>>({})
  const [config, setConfig] = useState<ConfigVotacion | null>(null)
  const [cargando, setCargando] = useState(true)
  const [operandoId, setOperandoId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    if (!eventoId) {
      setPagos([])
      setCargando(false)
      return
    }
    const supabase = getSupabase()
    try {
      const [pagosRes, votsRes, cfg] = await Promise.all([
        supabase
          .from('pagos_yape')
          .select('*')
          .eq('evento_id', eventoId)
          .order('created_at', { ascending: false }),
        supabase.from('votantes').select('*').eq('evento_id', eventoId),
        consultarConfiguracion(eventoId),
      ])
      if (pagosRes.error) logError('PagosYapePanel', pagosRes.error.message)
      setPagos((pagosRes.data ?? []) as PagoYape[])
      const mapa: Record<string, Votante> = {}
      for (const v of (votsRes.data ?? []) as Votante[]) mapa[v.id] = v
      setVotantes(mapa)
      setConfig(cfg)
    } catch (err) {
      logError('PagosYapePanel', err instanceof Error ? err.message : String(err))
    } finally {
      setCargando(false)
    }
  }, [eventoId])

  useEffect(() => {
    setCargando(true)
    void cargar()
  }, [cargar])

  const verificar = async (p: PagoYape, votos: number) => {
    if (operandoId) return
    setOperandoId(p.id)
    setError(null)
    const supabase = getSupabase()
    const { error: errUpd } = await supabase
      .from('pagos_yape')
      .update({
        estado: 'verificado',
        votos_otorgados: votos,
        verificado_por: 'Operador',
        notas: null,
      })
      .eq('id', p.id)
    if (errUpd) {
      logError('PagosYapePanel verificar', errUpd.message)
      setError(errUpd.message)
      setOperandoId(null)
      return
    }
    await registrarAccion(
      'Operador',
      'verificar_pago_yape',
      `Pago S/ ${Number(p.monto).toFixed(2)} (${p.numero_operacion}) verificado: +${votos} voto(s)`,
    )
    setOperandoId(null)
    await cargar()
  }

  const rechazar = async (p: PagoYape, notas: string) => {
    if (operandoId) return
    setOperandoId(p.id)
    setError(null)
    const supabase = getSupabase()
    const { error: errUpd } = await supabase
      .from('pagos_yape')
      .update({ estado: 'rechazado', verificado_por: 'Operador', notas })
      .eq('id', p.id)
    if (errUpd) {
      logError('PagosYapePanel rechazar', errUpd.message)
      setError(errUpd.message)
      setOperandoId(null)
      return
    }
    await registrarAccion(
      'Operador',
      'rechazar_pago_yape',
      `Pago S/ ${Number(p.monto).toFixed(2)} (${p.numero_operacion}) rechazado: ${notas}`,
    )
    setOperandoId(null)
    await cargar()
  }

  const pendientes = pagos.filter((p) => p.estado === 'pendiente')
  const resueltos = pagos.filter((p) => p.estado !== 'pendiente')

  return (
    <div className="panel-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-300">
            Verificación de pagos Yape
          </p>
          <p className="mt-1 text-xs text-navy-400">
            Solo se libera voto si el abono coincide con el monto exacto (S/ {config?.monto_por_pago.toFixed(2) ?? '—'}). Revisa el abono en tu celular antes de verificar.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-bold ring-1 ${
            pendientes.length > 0
              ? 'bg-amber-500/15 text-amber-300 ring-amber-400/30'
              : 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30'
          }`}
        >
          {pendientes.length} pendiente{pendientes.length === 1 ? '' : 's'}
        </span>
      </div>

      {error && <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}

      {cargando ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-navy-800/60" />
          ))}
        </div>
      ) : pendientes.length === 0 ? (
        <p className="mt-4 text-sm text-navy-400/80">No hay pagos esperando verificación.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {pendientes.map((p) => {
            const votante = votantes[p.votante_id]
            return (
              <div
                key={p.id}
                className="flex flex-col gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white">
                    S/ {Number(p.monto).toFixed(2)} ·{' '}
                    <span className="font-mono text-amber-300">{p.numero_operacion}</span>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-navy-300">
                    {votante?.email ?? 'Votante desconocido'}
                    {votante?.ip && votante.ip !== 'ip:desconocida' ? ` · ${votante.ip}` : ''}
                  </p>
                  <p className="text-[11px] text-navy-500">{fechaCorta(p.created_at)}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => void verificar(p, config?.votos_por_pago ?? 1)}
                    disabled={operandoId === p.id}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {operandoId === p.id ? 'Procesando…' : `✓ Verificar (+${config?.votos_por_pago ?? 1} voto)`}
                  </button>
                  <button
                    onClick={async () => {
                      const notas = window.prompt('Motivo del rechazo (p. ej. monto incorrecto, operación no encontrada):')
                      if (notas === null) return
                      await rechazar(p, notas.trim() || 'No especificado')
                    }}
                    disabled={operandoId === p.id}
                    className="rounded-xl border border-red-500/40 px-4 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {resueltos.length > 0 && (
        <div className="mt-5 border-t border-white/10 pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-navy-400">
            Recientes ({resueltos.length})
          </p>
          <ul className="mt-2 space-y-1">
            {resueltos.slice(0, 6).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-navy-300">
                  <span className="font-mono text-navy-200">{p.numero_operacion}</span> · S/ {Number(p.monto).toFixed(2)} · {votantes[p.votante_id]?.email ?? '?'}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    p.estado === 'verificado'
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-red-500/10 text-red-300'
                  }`}
                >
                  {p.estado === 'verificado' ? `✓ +${p.votos_otorgados} voto(s)` : '✕ rechazado'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}