import { useCallback, useEffect, useRef, useState } from 'react'
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
  const [cargando, setCargando] = useState(true)
  const [operando, setOperando] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const ultimoSonidoRef = useRef<string | null>(null)

  const cargar = useCallback(async () => {
    const lista = await listarPagosMesa(sesion.codigo)
    setPagos(lista)
    setCargando(false)

    // Notifica (sonido + aviso) cuando aparece un pago pendiente nuevo.
    const pendienteNuevo = lista.find((p) => p.estado === 'pendiente')
    if (pendienteNuevo && pendienteNuevo.id !== ultimoSonidoRef.current) {
      ultimoSonidoRef.current = pendienteNuevo.id
      setAviso(`Nuevo pago pendiente: ${pendienteNuevo.email ?? 'votante'} · ${pendienteNuevo.numero_operacion}`)
      try {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.speak(new SpeechSynthesisUtterance('Nuevo voto por confirmar'))
        }
      } catch {
        /* sin voz */
      }
    }
  }, [sesion.codigo])

  useEffect(() => {
    void cargar()
    const intervalo = window.setInterval(() => void cargar(), INTERVALO_MS)
    return () => window.clearInterval(intervalo)
  }, [cargar])

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

  const pendientes = pagos.filter((p) => p.estado === 'pendiente')
  const verificados = pagos.filter((p) => p.estado === 'verificado')
  const recaudado = verificados.reduce((s, p) => s + Number(p.monto), 0)

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
          <div className="mb-4 rounded-2xl border border-gold-500/40 bg-gold-500/10 px-4 py-3 text-sm font-semibold text-gold-200">
            {aviso}
          </div>
        )}

        {/* Resumen */}
        <div className="mb-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3 text-center">
            <p className="font-mono text-2xl font-black tabular-nums text-amber-300">{pendientes.length}</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-200/70">Por confirmar</p>
          </div>
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-center">
            <p className="font-mono text-2xl font-black tabular-nums text-emerald-300">{verificados.length}</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-200/70">Confirmados</p>
          </div>
          <div className="rounded-2xl border border-gold-400/30 bg-gold-500/10 p-3 text-center">
            <p className="font-mono text-2xl font-black tabular-nums text-gold-300">S/ {recaudado.toFixed(2)}</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gold-200/70">Recaudado</p>
          </div>
        </div>

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
                    ? 'border-amber-400/40 bg-amber-500/10'
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
                      <button
                        onClick={() => void resolver(p, 'rechazar')}
                        disabled={operando === p.id}
                        className="rounded-xl border border-red-400/40 px-3.5 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500/15 disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                      <button
                        onClick={() => void resolver(p, 'aprobar')}
                        disabled={operando === p.id}
                        className="rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-black uppercase text-navy-950 transition hover:bg-emerald-400 disabled:opacity-50"
                      >
                        {operando === p.id ? '…' : 'Confirmar ✓'}
                      </button>
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
          Verifica que el votante te haya mostrado el comprobante Yape antes de confirmar. Solo
          confirma si el pago fue por S/ {Number(pagos[0]?.monto ?? 2).toFixed(2)}.
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