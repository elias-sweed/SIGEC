import { useCallback, useEffect, useState } from 'react'
import { useCertamen } from '../context/CertamenContext'
import {
  consultarConfiguracion,
  consultarEstadoVotante,
  emitirVoto,
  type ConfigVotacion,
  type EstadoVotante,
  type ResultadoVoto,
} from '../services/votacion.service'
import type { Candidata } from '../types/database'
import { logError } from '../utils/devlog'
import logo from '../assets/Logo/logo.png'

interface Mensaje {
  tipo: 'error' | 'exito'
  texto: string
}

const ORDEN_GRADO: Record<string, number> = { '1': 1, '2': 2, '3': 3, '4': 4, '5': 5 }
const COLOR_AVATAR = [
  'from-gold-400 to-gold-600',
  'from-navy-400 to-navy-600',
  'from-rose-400 to-rose-600',
  'from-emerald-400 to-emerald-600',
  'from-sky-400 to-sky-600',
  'from-purple-400 to-purple-600',
]

function iniciales(nombre: string) {
  return nombre
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function usarEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
}

/* ─── Modal: correo para el 1er voto gratis ──────────────────────────── */

function ModalCorreo({
  abierto,
  onConfirm,
  onClose,
}: {
  abierto: boolean
  onConfirm: (email: string) => Promise<void>
  onClose: () => void
}) {
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  usarEscape(onClose)

  useEffect(() => {
    if (abierto) {
      setEmail('')
      setError(null)
    }
  }, [abierto])

  if (!abierto) return null

  const confirmar = async () => {
    if (enviando) return
    setError(null)
    setEnviando(true)
    try {
      await onConfirm(email)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-navy-950/80 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md space-y-4 rounded-3xl border border-gold-500/40 bg-navy-900 p-6 text-center shadow-2xl shadow-gold-500/20 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-lg font-bold text-white">🎟️ Un voto gratis por dispositivo</p>
        <p className="text-sm text-navy-300">
          Ingresa tu correo para confirmar tu voto gratis. Cada celular solo puede votar gratis una vez.
        </p>
        <input
          type="email"
          inputMode="email"
          placeholder="tucorreo@ejemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void confirmar()
          }}
          className="w-full rounded-xl border border-white/10 bg-navy-950 px-4 py-3 text-white placeholder-navy-500 outline-none transition focus:border-gold-500/60"
        />
        {error && <p className="text-sm font-semibold text-red-400">{error}</p>}
        <button
          onClick={confirmar}
          disabled={enviando || !email.trim()}
          className="w-full rounded-xl bg-gold-500 px-6 py-3 text-base font-bold text-navy-900 transition hover:bg-gold-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {enviando ? 'Registrando…' : 'Confirmar voto gratis'}
        </button>
        <button
          onClick={onClose}
          className="w-full rounded-xl border border-white/10 px-6 py-2.5 text-sm font-semibold text-navy-200 transition hover:bg-white/5 hover:text-white"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

/* ─── Modal: desbloqueo con Yape (2º voto) ───────────────────────────── */

function ModalYape({
  abierto,
  config,
  onConfirm,
  onClose,
}: {
  abierto: boolean
  config: ConfigVotacion
  onConfirm: (numeroOperacion: string) => Promise<void>
  onClose: () => void
}) {
  const [operacion, setOperacion] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  usarEscape(onClose)

  useEffect(() => {
    if (abierto) {
      setOperacion('')
      setError(null)
    }
  }, [abierto])

  if (!abierto) return null

  const confirmar = async () => {
    if (enviando) return
    setError(null)
    setEnviando(true)
    try {
      await onConfirm(operacion)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-navy-950/80 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md space-y-4 rounded-3xl border border-gold-500/40 bg-navy-900 p-6 text-center shadow-2xl shadow-gold-500/20 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-lg font-bold text-white">🔒 Vota otra vez con Yape</p>
        <p className="text-sm text-navy-300">
          {config.mensaje_bloqueo ?? 'Ya usaste tu voto gratis en este dispositivo. Yapea S/ ' +
            config.monto_por_pago +
            ' para volver a votar.'}
        </p>

        {config.yape_qr_url ? (
          <div className="mx-auto w-fit rounded-2xl bg-white p-3">
            <img src={config.yape_qr_url} alt="QR Yape" className="h-44 w-44 rounded-xl object-contain" />
          </div>
        ) : null}

        {config.yape_numero ? (
          <div className="rounded-xl border border-gold-500/30 bg-navy-950 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-navy-400">
              Paga a este número Yape
            </p>
            <p className="mt-1 font-mono text-2xl font-black tracking-wider text-gold-300">
              {config.yape_numero}
            </p>
          </div>
        ) : (
          <p className="text-xs text-amber-400">
            El administrador aún no ha configurado el número de Yape.
          </p>
        )}

        <p className="text-sm font-semibold text-white">
          Yapea exactamente{' '}
          <span className="font-black text-gold-300">S/ {config.monto_por_pago.toFixed(2)}</span>{' '}
          y obtienes {config.votos_por_pago}{' '}
          {config.votos_por_pago === 1 ? 'voto extra' : 'votos extra'}.
        </p>

        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={12}
          placeholder="Número de operación Yape"
          value={operacion}
          onChange={(e) => setOperacion(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void confirmar()
          }}
          className="w-full rounded-xl border border-white/10 bg-navy-950 px-4 py-3 text-center font-mono text-lg tracking-widest text-white placeholder-navy-500 outline-none transition focus:border-gold-500/60"
        />
        {error && <p className="text-sm font-semibold text-red-400">{error}</p>}
        <button
          onClick={confirmar}
          disabled={enviando || !operacion.trim()}
          className="w-full rounded-xl bg-gold-500 px-6 py-3 text-base font-bold text-navy-900 transition hover:bg-gold-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {enviando ? 'Registrando pago…' : 'Pagar y votar'}
        </button>
        <p className="text-[11px] text-navy-400">
          Ingresa el número de operación que te dio Yape. Si la verificación está en revisión, tu
          pago quedará "pendiente" hasta que la mesa de cobro lo confirme.
        </p>
      </div>
    </div>
  )
}

/* ─── Modal: voto emitido con éxito ──────────────────────────────────── */

function ModalExito({ resultado, config, onClose }: { resultado: ResultadoVoto; config: ConfigVotacion; onClose: () => void }) {
  usarEscape(onClose)
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md space-y-4 rounded-3xl border border-emerald-500/40 bg-navy-900 p-8 text-center shadow-2xl shadow-emerald-500/20 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-4xl">
          ✅
        </div>
        <p className="text-xl font-bold text-white">¡Voto enviado!</p>
        <p className="text-sm text-navy-300">
          {config.mensaje_exito ?? 'Gracias por participar. Tu voto quedó registrado.'}
        </p>
        {resultado.bloqueado ? (
          <p className="rounded-xl bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-300">
            Ya no te quedan votos disponibles en este evento.
          </p>
        ) : (
          <p className="text-sm text-navy-300">
            Te quedan{' '}
            <span className="font-bold text-white">
              {resultado.gratisRestantes} gratis · {resultado.pagosDisponibles} pagados
            </span>
            .
          </p>
        )}
        <button
          onClick={onClose}
          className="w-full rounded-xl bg-gold-500 px-6 py-3 text-base font-bold text-navy-900 transition hover:bg-gold-400 active:scale-[0.98]"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}

/* ─── Página principal ───────────────────────────────────────────────── */

export default function VotarPublico() {
  const { eventoCandidato, candidatas, cargando } = useCertamen()
  const eventoId = eventoCandidato?.id ?? null

  const [config, setConfig] = useState<ConfigVotacion | null>(null)
  const [estado, setEstado] = useState<EstadoVotante | null>(null)
  const [cargandoEstado, setCargandoEstado] = useState(true)
  const [paso, setPaso] = useState<'correo' | 'yape' | null>(null)
  const [candidataSel, setCandidataSel] = useState<Candidata | null>(null)
  const [ultimoVoto, setUltimoVoto] = useState<ResultadoVoto | null>(null)
  const [mensaje, setMensaje] = useState<Mensaje | null>(null)

  const recargarEstado = useCallback(async () => {
    if (!eventoId) return
    const [cfg, est] = await Promise.all([
      consultarConfiguracion(eventoId),
      consultarEstadoVotante(eventoId),
    ])
    setConfig(cfg)
    setEstado(est)
  }, [eventoId])

  useEffect(() => {
    let activo = true
    setCargandoEstado(true)
    ;(async () => {
      try {
        const [cfg, est] = await Promise.all([
          consultarConfiguracion(eventoId ?? ''),
          consultarEstadoVotante(eventoId ?? ''),
        ])
        if (!activo) return
        setConfig(cfg)
        setEstado(est)
      } catch (err) {
        logError('VotarPublico estado', err instanceof Error ? err.message : String(err))
      } finally {
        if (activo) setCargandoEstado(false)
      }
    })()
    return () => {
      activo = false
    }
  }, [eventoId])

  const ordenadas = [...candidatas].sort((a, b) => {
    const g = (ORDEN_GRADO[a.grado] ?? 99) - (ORDEN_GRADO[b.grado] ?? 99)
    if (g !== 0) return g
    const s = a.seccion.localeCompare(b.seccion)
    if (s !== 0) return s
    return a.nombre.localeCompare(b.nombre)
  })

  const emitir = async (input: {
    candidataId: string
    tipo: 'gratis' | 'pago'
    email?: string
    numeroOperacion?: string
  }) => {
    if (!eventoId) return
    setMensaje(null)
    const res = await emitirVoto({ eventoId, ...input })
    setUltimoVoto(res)
    await recargarEstado()
  }

  const manejarVotar = (c: Candidata) => {
    if (!config?.habilitada) {
      setMensaje({ tipo: 'error', texto: 'La votación está desactivada en este momento.' })
      return
    }
    if (estado?.pagoPendiente && !(estado.pagosDisponibles ?? 0)) {
      setMensaje({
        tipo: 'error',
        texto:
          'Tu pago está pendiente de confirmación. Acércate a la mesa de cobro; en cuanto lo confirmen, toca Votar de nuevo.',
      })
      return
    }
    if (!estado?.registrado) {
      setCandidataSel(c)
      setPaso('correo')
      return
    }
    if ((estado.gratisRestantes ?? 0) > 0) {
      void emitir({ candidataId: c.id, tipo: 'gratis' }).catch((err) => {
        setMensaje({ tipo: 'error', texto: err instanceof Error ? err.message : String(err) })
      })
      return
    }
    if ((estado.pagosDisponibles ?? 0) > 0) {
      void emitir({ candidataId: c.id, tipo: 'pago' }).catch((err) => {
        setMensaje({ tipo: 'error', texto: err instanceof Error ? err.message : String(err) })
      })
      return
    }
    setCandidataSel(c)
    setPaso('yape')
  }

  const confirmarCorreo = async (email: string) => {
    if (!eventoId || !candidataSel) return
    await emitir({ candidataId: candidataSel.id, tipo: 'gratis', email })
    setPaso(null)
    setCandidataSel(null)
  }

  const confirmarPago = async (numeroOperacion: string) => {
    if (!eventoId || !candidataSel) return
    try {
      await emitir({ candidataId: candidataSel.id, tipo: 'pago', numeroOperacion })
      setPaso(null)
      setCandidataSel(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.toLowerCase().includes('pendiente')) {
        // El pago quedó registrado; la mesa debe confirmarlo. Se cierra el modal
        // y se muestra el aviso + banner de pago pendiente.
        setPaso(null)
        setCandidataSel(null)
        setMensaje({ tipo: 'error', texto: msg })
        await recargarEstado()
        return
      }
      throw err
    }
  }

  if (cargando && !eventoCandidato) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-950">
        <div className="space-y-6 animate-pulse">
          <div className="mx-auto h-12 w-12 rounded-xl bg-navy-700" />
          <div className="mx-auto h-10 w-72 rounded bg-navy-700" />
          <div className="mx-auto h-4 w-56 rounded bg-navy-700" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-navy-950">
      {/* Fondo con beams */}
      <div aria-hidden className="pointer-events-none fixed inset-0 bg-linear-to-br from-navy-900 via-navy-950 to-black" />

      <div className="relative z-10 mx-auto max-w-lg px-4 pb-16 pt-6">
        {/* Encabezado */}
        <header className="mb-6 flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-navy-900/60 px-5 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="h-10 w-10 rounded-xl object-contain ring-1 ring-gold-500/40" />
            <div className="leading-tight">
              <p className="text-sm font-bold text-white">
                {eventoCandidato?.etapa ?? 'Votación popular'}
              </p>
              <p className="text-[11px] text-navy-300">Vota por tu candidata favorita</p>
            </div>
          </div>
          <div className="text-right text-[11px] leading-tight">
            <p className="font-bold text-gold-300">
              {estado?.registrado ? `${estado.votosEmitidos} votos` : '— votos'}
            </p>
            <p className="text-navy-400">
              {estado?.gratisRestantes ?? 1} gratis · {estado?.pagosDisponibles ?? 0} pagados
            </p>
          </div>
        </header>

        {mensaje && (
          <div
            className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${
              mensaje.tipo === 'error'
                ? 'border-red-500/30 bg-red-500/10 text-red-300'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
            }`}
          >
            {mensaje.texto}
          </div>
        )}

        {estado?.pagoPendiente && estado.registrado && (
          <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-300">
            Tu pago queda en "pendiente" hasta que la mesa de cobro lo confirme. En cuanto te
            confirmen, toca <span className="text-white">Votar</span> de nuevo para registrar tu
            voto.
          </div>
        )}

        {estado?.bloqueado && estado.registrado && !estado.pagoPendiente && (
          <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-300">
            Ya agotaste tus votos gratis en este evento. Toca una candidata para desbloquear más con
            Yape.
          </div>
        )}

        {!config?.habilitada && (
          <div className="mb-4 rounded-2xl border border-white/10 bg-navy-900/60 px-4 py-3 text-sm font-semibold text-navy-200">
            La votación pública está desactivada por el momento.
          </div>
        )}

        {/* Lista de candidatas */}
        {cargandoEstado && !estado ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-navy-800/70" />
            ))}
          </div>
        ) : ordenadas.length === 0 ? (
          <p className="py-16 text-center text-sm text-navy-400">No hay candidatas en este evento.</p>
        ) : (
          <div className="space-y-3">
            {ordenadas.map((c, i) => (
              <div
                key={c.id}
                className="flex items-center gap-4 rounded-3xl border border-white/10 bg-navy-900/60 p-4 backdrop-blur"
              >
                <div
                  className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-br font-bold text-white ring-2 ring-white/15 ${COLOR_AVATAR[i % COLOR_AVATAR.length]}`}
                >
                  {c.foto_url ? (
                    <img src={c.foto_url} alt={c.nombre} className="h-full w-full object-cover" />
                  ) : (
                    iniciales(c.nombre)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold text-white">{c.nombre}</p>
                  <p className="text-xs text-navy-300">
                    {c.grado}º Grado · Sección {c.seccion}
                  </p>
                </div>
                <button
                  onClick={() => manejarVotar(c)}
                  disabled={!config?.habilitada}
                  className="shrink-0 rounded-xl bg-gold-500 px-5 py-3 text-sm font-black uppercase tracking-wide text-navy-900 transition hover:bg-gold-400 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Votar
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="mt-8 text-center text-[11px] text-navy-500">
          1 voto gratis por dispositivo · El voto es electrónico y se registra automáticamente
        </p>
      </div>

      {/* Modales */}
      <ModalCorreo
        abierto={paso === 'correo'}
        onConfirm={confirmarCorreo}
        onClose={() => setPaso(null)}
      />
      {config && (
        <ModalYape
          abierto={paso === 'yape'}
          config={config}
          onConfirm={confirmarPago}
          onClose={() => setPaso(null)}
        />
      )}
      {ultimoVoto && config && (
        <ModalExito resultado={ultimoVoto} config={config} onClose={() => setUltimoVoto(null)} />
      )}
    </div>
  )
}