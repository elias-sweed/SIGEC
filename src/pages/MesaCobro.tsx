import { useCallback, useEffect, useRef, useState } from 'react'
import { consultarConfiguracion, type ConfigVotacion } from '../services/votacion.service'
import { urlQRYape } from '../utils/yape'
import logo from '../assets/Logo/logo.png'
import {
  aprobarPagoMesa,
  guardarSesionMesa,
  leerSesionMesa,
  limpiarSesionMesa,
  listarPagosMesa,
  obtenerMesaPorCodigo,
  rechazarPagoMesa,
  type MesaSesion,
  type PagoMesa,
} from '../services/mesas.service'
import { logError } from '../utils/devlog'

const INTERVALO_MS = 5000

function fechaHora(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return iso
  }
}

/* ─── Login de la mesa ─────────────────────────────────────────────── */

function LoginMesa({ onEntrar }: { onEntrar: (sesion: MesaSesion) => void }) {
  const [codigo, setCodigo] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const entrar = async () => {
    if (buscando) return
    setBuscando(true)
    setError(null)
    try {
      const sesion = await obtenerMesaPorCodigo(codigo)
      if (!sesion) {
        setError('Código de mesa inválido o deshabilitado.')
        return
      }
      onEntrar(sesion)
    } catch (err) {
      logError('MesaCobro.login', err instanceof Error ? err.message : String(err))
      setError('No se pudo validar el código. Inténtalo de nuevo.')
    } finally {
      setBuscando(false)
    }
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-navy-950 px-6">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-linear-to-br from-navy-900 via-navy-950 to-black" />

      <div className="relative z-10 w-full max-w-md space-y-6 rounded-3xl border border-white/10 bg-navy-900/70 p-8 backdrop-blur">
        <div className="flex flex-col items-center gap-3 text-center">
          <img src={logo} alt="Logo" className="h-14 w-14 rounded-xl object-contain ring-1 ring-gold-500/40" />
          <div>
            <p className="text-xl font-bold text-white">Mesa de cobro</p>
            <p className="text-sm text-navy-300">Ingresa el código que te dio el organizador</p>
          </div>
        </div>

        <input
          type="text"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase().trim())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void entrar()
          }}
          placeholder="CÓDIGO DE MESA"
          className="w-full rounded-xl border border-white/10 bg-navy-950 px-4 py-3 text-center font-mono text-2xl font-black tracking-[0.4em] text-gold-300 placeholder-navy-600 outline-none transition focus:border-gold-500/60"
        />

        {error && <p className="text-center text-sm font-semibold text-red-400">{error}</p>}

        <button
          onClick={() => void entrar()}
          disabled={buscando || !codigo.trim()}
          className="w-full rounded-xl bg-gold-500 px-6 py-3 text-base font-bold text-navy-900 transition hover:bg-gold-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {buscando ? 'Validando…' : 'Entrar a la mesa'}
        </button>
      </div>
    </div>
  )
}

/* ─── Dashboard de la mesa ──────────────────────────────────────────── */

function DashboardMesa({ sesion, onSalir }: { sesion: MesaSesion; onSalir: () => void }) {
  const [pagos, setPagos] = useState<PagoMesa[]>([])
  const [config, setConfig] = useState<ConfigVotacion | null>(null)
  const [cargando, setCargando] = useState(true)
  const [operando, setOperando] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [nuevoId, setNuevoId] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState<{ id: string; accion: 'aprobar' | 'rechazar' } | null>(null)
  const [verDetalle, setVerDetalle] = useState(false)
  const timeoutConfirmRef = useRef<number | null>(null)
  const timeoutNuevoRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutConfirmRef.current) window.clearTimeout(timeoutConfirmRef.current)
      if (timeoutNuevoRef.current) window.clearTimeout(timeoutNuevoRef.current)
    }
  }, [])

  const cargar = useCallback(async () => {
    const lista = await listarPagosMesa(sesion.codigo)
    setPagos((prev) => {
      // Mejora #3: marca como NUEVO el pago pendiente que no estaba antes.
      const idsPrevios = new Set(prev.map((p) => p.id))
      const pendienteNuevo = lista.find((p) => p.estado === 'pendiente' && !idsPrevios.has(p.id))
      if (pendienteNuevo) {
        setNuevoId(pendienteNuevo.id)
        if (timeoutNuevoRef.current) window.clearTimeout(timeoutNuevoRef.current)
        timeoutNuevoRef.current = window.setTimeout(() => setNuevoId(null), 10000)
        setAviso(`🔔 Nuevo pago pendiente: ${pendienteNuevo.email ?? 'votante'} · ${pendienteNuevo.numero_operacion}. ¡Verifica y confirma!`)
        try {
          if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.speak(new SpeechSynthesisUtterance('Nuevo voto por confirmar'))
          }
        } catch {
          /* sin voz */
        }
      }
      return lista
    })
    setCargando(false)
  }, [sesion.codigo])

  useEffect(() => {
    void cargar()
    const intervalo = window.setInterval(() => void cargar(), INTERVALO_MS)
    return () => window.clearInterval(intervalo)
  }, [cargar])

  // Mejora #1: muestra el Yape del evento para que el cobrador sepa con qué validar.
  useEffect(() => {
    let activo = true
    consultarConfiguracion(sesion.eventoId)
      .then((cfg) => {
        if (activo) setConfig(cfg)
      })
      .catch((err) => logError('MesaCobro.config', err instanceof Error ? err.message : String(err)))
    return () => {
      activo = false
    }
  }, [sesion.eventoId])

  const resolver = async (pago: PagoMesa, accion: 'aprobar' | 'rechazar') => {
    if (operando) return
    setOperando(pago.id)
    setAviso(null)
    try {
      if (accion === 'aprobar') await aprobarPagoMesa(pago.id, sesion.codigo)
      else await rechazarPagoMesa(pago.id, sesion.codigo)
      await cargar()
    } catch (err) {
      setAviso(err instanceof Error ? err.message : String(err))
    } finally {
      setOperando(null)
    }
  }

  // Mejora #4: doble toque para confirmar (evita accidentes).
  const pedirConfirmacion = (pago: PagoMesa, accion: 'aprobar' | 'rechazar') => {
    if (operando === pago.id) return
    if (confirmando?.id === pago.id && confirmando.accion === accion) {
      if (timeoutConfirmRef.current) window.clearTimeout(timeoutConfirmRef.current)
      setConfirmando(null)
      void resolver(pago, accion)
      return
    }
    setConfirmando({ id: pago.id, accion })
    if (timeoutConfirmRef.current) window.clearTimeout(timeoutConfirmRef.current)
    timeoutConfirmRef.current = window.setTimeout(() => setConfirmando(null), 4000)
  }

  const pendientes = pagos.filter((p) => p.estado === 'pendiente')
  // Mejora #2: SOLO lo que aprobó ESTA mesa (mesa_verifico_id = sesion.id).
  const misVerificados = pagos.filter(
    (p) => p.estado === 'verificado' && p.mesa_verifico_id === sesion.id,
  )
  const miRecaudado = misVerificados.reduce((s, p) => s + Number(p.monto), 0)

  const esNuevo = (p: PagoMesa) => nuevoId === p.id
  const confirmandoEste = (p: PagoMesa) => confirmando?.id === p.id

  return (
    <div className="min-h-screen w-full bg-navy-950">
      <div aria-hidden className="pointer-events-none fixed inset-0 bg-linear-to-br from-navy-900 via-navy-950 to-black" />

      <div className="relative z-10 mx-auto max-w-2xl px-4 pb-16 pt-6">
        {/* Cabecera */}
        <header className="mb-5 flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-navy-900/60 px-5 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="h-10 w-10 rounded-xl object-contain ring-1 ring-gold-500/40" />
            <div className="leading-tight">
              <p className="text-sm font-bold text-white">{sesion.nombre}</p>
              <p className="text-[11px] text-navy-300">Mesa de cobro de votos</p>
            </div>
          </div>
          <button
            onClick={onSalir}
            className="shrink-0 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-navy-200 transition hover:bg-white/5 hover:text-white"
          >
            Salir
          </button>
        </header>

        {aviso && (
          <div className="mb-4 animate-pulse rounded-2xl border border-gold-500/50 bg-gold-500/15 px-4 py-3 text-sm font-semibold text-gold-200 shadow-[0_0_24px_rgba(201,162,39,0.25)]">
            {aviso}
          </div>
        )}

        {/* Mejora #1: datos del Yape a validar */}
        {config && (
          <div className="mb-5 flex flex-wrap items-center gap-4 rounded-3xl border border-white/10 bg-navy-900/60 px-5 py-4 backdrop-blur">
            {urlQRYape(config.yape_numero, config.yape_titular, config.yape_banco) ? (
              <img
                src={urlQRYape(config.yape_numero, config.yape_titular, config.yape_banco, 96)}
                alt="QR Yape de referencia"
                className="h-16 w-16 shrink-0 rounded-lg bg-white p-0.5"
              />
            ) : null}
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-navy-400">
                Pago que debes verificar
              </p>
              {config.yape_numero ? (
                <p className="mt-0.5 font-mono text-base font-black tracking-wide text-white">
                  S/ {Number(config.monto_por_pago).toFixed(2)} →{' '}
                  <span className="text-gold-300">{config.yape_numero}</span>
                </p>
              ) : (
                <p className="mt-0.5 text-sm font-semibold text-amber-300">
                  El organizador aún no configura el Yape en el panel.
                </p>
              )}
              <p className="text-[11px] text-navy-300">
                {config.yape_titular?.trim() || 'Sin titular configurado'} ·{' '}
                {config.votos_por_pago} {config.votos_por_pago === 1 ? 'voto' : 'votos'} por pago
              </p>
            </div>
          </div>
        )}

        {/* Resumen */}
        <div className="mb-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3 text-center">
            <p className="font-mono text-2xl font-black tabular-nums text-amber-300">{pendientes.length}</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-200/70">Por confirmar</p>
          </div>
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-center">
            <p className="font-mono text-2xl font-black tabular-nums text-emerald-300">{misVerificados.length}</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-200/70">Mis confirmados</p>
          </div>
          <button
            onClick={() => setVerDetalle((v) => !v)}
            className="rounded-2xl border border-gold-400/40 bg-gold-500/15 p-3 text-center transition hover:bg-gold-500/25"
            title="Ver detalle de lo que recaudó esta mesa"
          >
            <p className="font-mono text-xl font-black tabular-nums text-gold-300">S/ {miRecaudado.toFixed(2)}</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gold-200/80">
              Mi recaudado {verDetalle ? '▲' : '▼'}
            </p>
          </button>
        </div>

        {/* Mejora #2: detalle de lo recaudado por ESTA mesa */}
        {verDetalle && (
          <div className="mb-5 rounded-3xl border border-white/10 bg-navy-900/60 p-4 backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-widest text-gold-300">
              Confirmados por {sesion.nombre} ({misVerificados.length})
            </p>
            {misVerificados.length === 0 ? (
              <p className="mt-2 text-sm text-navy-400">Aún no has confirmado ningún pago.</p>
            ) : (
              <ul className="mt-2 max-h-52 space-y-1.5 overflow-y-auto">
                {misVerificados.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 rounded-xl bg-navy-800/50 px-3 py-2 text-sm">
                    <span className="grid h-7 w-9 shrink-0 place-items-center rounded-lg bg-emerald-500/15 font-mono text-[10px] font-bold text-emerald-300">
                      S/ {Number(p.monto).toFixed(2)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-white">{p.email ?? 'Votante'}</span>
                    <span className="shrink-0 font-mono text-xs text-navy-300">{p.numero_operacion}</span>
                    <span className="shrink-0 text-[11px] text-navy-400">{fechaHora(p.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 border-t border-white/10 pt-2 text-center font-mono text-sm font-bold text-gold-300">
              Total: S/ {miRecaudado.toFixed(2)}
            </p>
          </div>
        )}

        {/* Lista de pagos */}
        {cargando ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-navy-800/70" />
            ))}
          </div>
        ) : pagos.length === 0 ? (
          <p className="rounded-3xl border border-white/10 bg-navy-900/60 px-6 py-10 text-center text-sm text-navy-300">
            Aún no hay pagos registrados. Dile a los votantes que ingresen su número de operación Yape.
          </p>
        ) : (
          <div className="space-y-3">
            {pagos.map((p) => (
              <div
                key={p.id}
                className={`rounded-3xl border p-4 backdrop-blur transition ${
                  p.estado === 'pendiente'
                    ? esNuevo(p)
                      ? 'border-gold-400/70 bg-gold-500/15 shadow-[0_0_28px_rgba(201,162,39,0.35)] animate-pulse'
                      : 'border-amber-400/40 bg-amber-500/10'
                    : p.estado === 'verificado'
                      ? 'border-emerald-400/30 bg-navy-900/50 opacity-70'
                      : 'border-red-400/30 bg-red-500/5 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">{p.email ?? 'Votante'}</p>
                    <p className="mt-0.5 font-mono text-xs text-navy-300">
                      Op. <span className="text-gold-300">{p.numero_operacion}</span> · S/{' '}
                      {Number(p.monto).toFixed(2)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-navy-400">{fechaHora(p.created_at)}</p>
                    {p.estado === 'verificado' && p.verificado_por && (
                      <p className="mt-0.5 text-[10px] text-emerald-400/70">Confirmado por {p.verificado_por}</p>
                    )}
                  </div>

                  {p.estado === 'pendiente' ? (
                    <div className="flex shrink-0 items-center gap-2">
                      {esNuevo(p) && (
                        <span className="animate-pulse rounded-full bg-gold-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-navy-950">
                          Nuevo
                        </span>
                      )}
                      {confirmandoEste(p) && confirmando?.accion === 'rechazar' ? (
                        <>
                          <span className="text-[11px] font-semibold text-red-300">¿Rechazar?</span>
                          <button
                            onClick={() => pedirConfirmacion(p, 'rechazar')}
                            className="rounded-xl bg-red-500 px-3.5 py-2 text-xs font-black uppercase text-white transition hover:bg-red-400"
                          >
                            Sí
                          </button>
                          <button
                            onClick={() => setConfirmando(null)}
                            className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-navy-200"
                          >
                            No
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => pedirConfirmacion(p, 'rechazar')}
                          disabled={operando === p.id}
                          className="rounded-xl border border-red-400/40 px-3.5 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500/15 disabled:opacity-50"
                        >
                          Rechazar
                        </button>
                      )}

                      {confirmandoEste(p) && confirmando?.accion === 'aprobar' ? (
                        <>
                          <span className="text-[11px] font-black uppercase text-emerald-300">
                            ¿Confirmas S/ {Number(p.monto).toFixed(2)}?
                          </span>
                          <button
                            onClick={() => pedirConfirmacion(p, 'aprobar')}
                            disabled={operando === p.id}
                            className="rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-black uppercase text-navy-950 transition hover:bg-emerald-400 disabled:opacity-50"
                          >
                            {operando === p.id ? '…' : 'Sí, confirmar'}
                          </button>
                          <button
                            onClick={() => setConfirmando(null)}
                            className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-navy-200"
                          >
                            No
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => pedirConfirmacion(p, 'aprobar')}
                          disabled={operando === p.id}
                          className="rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-black uppercase text-navy-950 transition hover:bg-emerald-400 disabled:opacity-50"
                        >
                          {operando === p.id ? '…' : 'Confirmar ✓'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                        p.estado === 'verificado'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-red-500/15 text-red-300'
                      }`}
                    >
                      {p.estado}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-6 text-center text-[11px] text-navy-400">
          Verifica que el votante te muestre el comprobante Yape por S/ {Number(config?.monto_por_pago ?? 2).toFixed(2)}{' '}
          antes de confirmar. El pago debe llegar a la cuenta de la mesa.
        </p>
      </div>
    </div>
  )
}

/* ─── Página ───────────────────────────────────────────────────────── */

export default function MesaCobro() {
  const [sesion, setSesion] = useState<MesaSesion | null>(() => leerSesionMesa())

  const entrar = (s: MesaSesion) => {
    guardarSesionMesa(s)
    setSesion(s)
  }

  const salir = () => {
    limpiarSesionMesa()
    setSesion(null)
  }

  if (!sesion) return <LoginMesa onEntrar={entrar} />

  return <DashboardMesa sesion={sesion} onSalir={salir} />
}