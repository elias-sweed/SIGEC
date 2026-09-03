import { useEffect, useMemo, useState } from 'react'
import { urlQRIngreso } from '../../services/jurado.service'
import logo from '../../assets/Logo/logo.png'

interface QRSugerencias {
  evento?: string
  abierto: boolean
  onCerrar: () => void
}

const DURACION_MIN = 5
const DURACION_MAX = 30
const QR_SIZE = 480

export default function QRIngresoModal({ evento, abierto, onCerrar }: QRSugerencias) {
  const [duracion, setDuracion] = useState(10)
  const [restante, setRestante] = useState<number | null>(null)
  const [contando, setContando] = useState(false)

  const qrUrl = useMemo(() => urlQRIngreso(QR_SIZE), [])

  // Al cerrar, se resetea el estado
  useEffect(() => {
    if (!abierto) {
      setContando(false)
      setRestante(null)
    }
  }, [abierto])

  useEffect(() => {
    if (!contando || restante === null) return
    if (restante <= 0) {
      setContando(false)
      setRestante(null)
      return
    }
    const t = setTimeout(() => setRestante((r) => (r === null ? null : r - 1)), 1000)
    return () => clearTimeout(t)
  }, [contando, restante])

  if (!abierto) return null

  const iniciarCuenta = () => {
    setRestante(duracion)
    setContando(true)
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-navy-950">
      {/* Fondo con beams */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-linear-to-br from-navy-900 via-navy-950 to-black" />

      <div className="relative z-10 flex w-full max-w-lg flex-col items-center gap-6 px-6 text-center">
        {/* Logo + evento */}
        <div className="flex items-center gap-3">
          <img src={logo} alt="Logo" className="h-12 w-12 rounded-xl object-contain ring-1 ring-gold-500/40" />
          <div className="text-left leading-tight">
            <p className="text-lg font-bold text-white">{evento ?? 'Certamen'}</p>
            <p className="text-xs text-gold-400">Acceso de Jurados</p>
          </div>
        </div>

        {/* Control de duración y botón iniciar (solo antes de contar) */}
        {!contando ? (
          <div className="flex w-full flex-col items-center gap-3 rounded-2xl border border-white/10 bg-navy-900/70 p-5">
            <p className="text-sm text-navy-200">Duración del QR mostrado</p>
            <div className="flex items-center gap-4">
              <span className="text-xs text-navy-400">{DURACION_MIN}s</span>
              <input
                type="range"
                min={DURACION_MIN}
                max={DURACION_MAX}
                value={duracion}
                onChange={(e) => setDuracion(Number(e.target.value))}
                className="w-56 accent-gold-500"
              />
              <span className="text-xs text-navy-400">{DURACION_MAX}s</span>
            </div>
            <span className="font-mono text-2xl font-bold text-gold-400">{duracion} s</span>
            <button
              onClick={iniciarCuenta}
              className="mt-1 rounded-xl bg-gold-500 px-8 py-3 text-base font-bold text-navy-900 transition hover:bg-gold-400 active:scale-[0.98]"
            >
              Mostrar QR ({duracion}s)
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            {/* Contador */}
            <div className="flex items-center gap-2">
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-full font-mono text-2xl font-bold ${
                  restante !== null && restante <= 3
                    ? 'bg-red-500/20 text-red-300'
                    : 'bg-gold-500/20 text-gold-300'
                }`}
              >
                {restante}
              </span>
              <span className="text-sm text-navy-300">segundos</span>
            </div>

            {/* QR grande */}
            <div className="rounded-3xl bg-white p-3 shadow-2xl shadow-black/60">
              <img
                src={qrUrl}
                alt="QR de ingreso de jurados"
                className="h-72 w-72 rounded-2xl object-contain sm:h-80 sm:w-80"
              />
            </div>

            <p className="text-lg font-semibold text-white">Jurados, escaneen para ingresar</p>
            <p className="max-w-xs text-xs text-navy-400">
              Escanea el código con la cámara del celular para abrir el acceso. El QR se cierra
              automáticamente al terminar el tiempo.
            </p>

            {restante === 0 || restante === null ? (
              <p className="text-lg font-bold text-emerald-400">¡Tiempo agotado!</p>
            ) : null}
          </div>
        )}

        <button
          onClick={onCerrar}
          className="rounded-xl border border-white/10 px-6 py-3 text-sm font-semibold text-navy-200 transition hover:bg-white/5 hover:text-white"
        >
          ← Volver al Panel
        </button>
      </div>
    </div>
  )
}
