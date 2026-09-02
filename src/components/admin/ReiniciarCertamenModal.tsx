import { useEffect, useState } from 'react'
import { verificarContrasenaSuperadmin } from '../../lib/adminAuth'

interface ReiniciarCertamenModalProps {
  abierto: boolean
  onCerrar: () => void
  onConfirmar: () => Promise<void>
}

const PALABRA_CONFIRMACION = 'BORRAR'

export default function ReiniciarCertamenModal({
  abierto,
  onCerrar,
  onConfirmar,
}: ReiniciarCertamenModalProps) {
  const [password, setPassword] = useState('')
  const [texto, setTexto] = useState('')
  const [verificando, setVerificando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!abierto) {
      setPassword('')
      setTexto('')
      setError(null)
      setVerificando(false)
    }
  }, [abierto])

  if (!abierto) return null

  const contrasenaOk = password.length >= 6
  const textoOk = texto === PALABRA_CONFIRMACION

  const confirmar = async () => {
    setError(null)
    if (!verificando) {
      setVerificando(true)
      try {
        const ok = await verificarContrasenaSuperadmin(password)
        if (!ok) {
          setError('Contraseña incorrecta. No se puede reiniciar el certamen.')
          setVerificando(false)
          return
        }
      } catch {
        setError('No se pudo verificar la contraseña. Inténtalo de nuevo.')
        setVerificando(false)
        return
      }
      return
    }
    // Segunda confirmación: palabra clave + botón rojo
    setVerificando(false)
    await onConfirmar()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl border border-red-500/30 bg-navy-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-red-400">
              Acción destructiva
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">Reiniciar Certamen</h2>
          </div>
          <button
            onClick={onCerrar}
            className="rounded-full px-3 py-1 text-sm text-navy-300 transition hover:bg-white/5 hover:text-white"
          >
            ✕
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-navy-300">
          Esto <span className="font-bold text-red-300">eliminará todos los datos</span> del
          certamen: evaluaciones, candidatas, jurados, criterios y el evento. <b>No se puede
          deshacer.</b>
        </p>

        <div className="mt-5 space-y-4">
          {/* Paso 1: contraseña */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-navy-300">
              Paso 1 — Contraseña del administrador
            </label>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError(null)
              }}
              placeholder="Contraseña de superadmin"
              className="input-panel mt-2 w-full"
            />
          </div>

          {/* Paso 2: palabra de confirmación */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-navy-300">
              Paso 2 — Escribe <span className="text-red-300">{PALABRA_CONFIRMACION}</span> para confirmar
            </label>
            <input
              type="text"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={PALABRA_CONFIRMACION}
              className="input-panel mt-2 w-full uppercase"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <div className="mt-6 flex flex-col gap-2">
          {!verificando ? (
            <button
              onClick={() => void confirmar()}
              disabled={!contrasenaOk || !textoOk}
              className="btn-danger w-full disabled:cursor-not-allowed disabled:opacity-40"
            >
              Verificar y continuar
            </button>
          ) : (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-center">
              <p className="text-sm font-semibold text-red-200">
                Contraseña verificada. Si continúas se borrará TODO.
              </p>
              <button
                onClick={() => void confirmar()}
                className="mt-3 w-full rounded-xl border border-red-500 bg-red-600 px-4 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-red-500 active:scale-[0.98]"
              >
                ⚠ Eliminar definitivamente
              </button>
            </div>
          )}
          <button
            onClick={onCerrar}
            className="rounded-xl px-4 py-3 text-sm font-semibold text-navy-300 transition hover:bg-white/5 hover:text-white"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
