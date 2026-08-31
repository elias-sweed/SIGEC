import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { getSupabase } from '../lib/supabase'
import { emailDeJurado, marcarActivado, obtenerJuradoPorCodigo } from '../services/jurado.service'
import { marcarActivadoLocal } from '../utils/session'
import { logConsulta, logError } from '../utils/devlog'
import type { Jurado } from '../types/database'

export default function JuradoActivar() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const codigo = (params.get('codigo') ?? '').trim().toUpperCase()

  const [jurado, setJurado] = useState<Jurado | null>(null)
  const [cargando, setCargando] = useState(true)
  const [password, setPassword] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!codigo) {
      setCargando(false)
      return
    }
    ;(async () => {
      const j = await obtenerJuradoPorCodigo(codigo)
      setJurado(j)
      setCargando(false)
    })()
  }, [codigo])

  if (!codigo) {
    return <Navigate to="/jurado" replace />
  }

  const email = jurado ? emailDeJurado(jurado.codigo) : emailDeJurado(codigo)

  const activar = async () => {
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (password !== confirmacion) {
      setError('Las contraseñas no coinciden')
      return
    }
    setEnviando(true)
    setError(null)

    const supabase = getSupabase()
    logConsulta(`Activar cuenta: ${email}`)
    const { data, error: errSignUp } = await supabase.auth.signUp({ email, password })

    if (errSignUp) {
      const mensaje = errSignUp.message.toLowerCase()
      const yaExiste =
        mensaje.includes('already') ||
        mensaje.includes('registered') ||
        mensaje.includes('existe')
      if (yaExiste && jurado) {
        await marcarActivado(jurado.id, email)
        marcarActivadoLocal(codigo)
        navigate(`/jurado?codigo=${codigo}`, { replace: true })
        return
      }
      logError('signUp', errSignUp.message)
      setError(errSignUp.message)
      setEnviando(false)
      return
    }

    if (jurado) {
      await marcarActivado(jurado.id, email, data.user?.id)
    }
    marcarActivadoLocal(codigo)
    navigate(`/jurado?codigo=${codigo}`, { replace: true })
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-8 shadow-2xl">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-500 text-3xl">
          🎫
        </span>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
          Primer acceso
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">Activa tu cuenta</h1>
      </div>

      {cargando ? (
        <p className="mt-8 text-center text-sm text-navy-400">Verificando código…</p>
      ) : !jurado ? (
        <div className="mt-8 text-center">
          <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
            Código no válido. Verifica el QR con el administrador.
          </p>
          <Link
            to="/jurado"
            className="mt-4 inline-block rounded-lg bg-gold-500 px-5 py-2.5 text-sm font-semibold text-navy-900 transition hover:bg-gold-400"
          >
            Ir al inicio de sesión
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-white/10 bg-navy-800/50 px-4 py-3 text-center">
            <p className="text-sm font-semibold text-white">{jurado.nombre}</p>
            <p className="font-mono text-xs font-bold text-gold-400">{jurado.codigo}</p>
            <p className="mt-1 text-xs text-navy-400">{email}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.25em] text-navy-300">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="mt-2 w-full rounded-xl border border-white/10 bg-navy-800 px-4 py-3.5 text-white placeholder:text-navy-500 focus:border-gold-500/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.25em] text-navy-300">
              Confirmar contraseña
            </label>
            <input
              type="password"
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
              placeholder="Repite la contraseña"
              className="mt-2 w-full rounded-xl border border-white/10 bg-navy-800 px-4 py-3.5 text-white placeholder:text-navy-500 focus:border-gold-500/50 focus:outline-none"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-center text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            onClick={activar}
            disabled={enviando}
            className="w-full rounded-xl bg-gold-500 py-4 text-base font-bold text-navy-900 transition hover:bg-gold-400 active:scale-[0.98] disabled:opacity-50"
          >
            {enviando ? 'Activando…' : 'Activar mi cuenta'}
          </button>

          <p className="text-center text-xs leading-relaxed text-navy-500">
            Con esta contraseña iniciarás sesión en cada evaluación del certamen.
          </p>
        </div>
      )}
    </div>
  )
}