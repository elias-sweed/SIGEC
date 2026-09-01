import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import PasswordInput from '../components/form/PasswordInput'
import Lightning from '../components/effects/Lightning'
import { esSuperadminAutenticado, iniciarSesionSuperadmin } from '../lib/adminAuth'
import { logError } from '../utils/devlog'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [entrando, setEntrando] = useState(false)
  const [yaLogueado, setYaLogueado] = useState(false)
  const [verificando, setVerificando] = useState(true)

  useEffect(() => {
    ;(async () => {
      const ok = await esSuperadminAutenticado()
      setYaLogueado(ok)
      setVerificando(false)
    })()
  }, [])

  const entrar = async () => {
    if (!email.trim() || !password) {
      setError('Ingresa tu correo y contraseña')
      return
    }
    setEntrando(true)
    setError(null)

    const res = await iniciarSesionSuperadmin(email, password)
    if (!res.ok) {
      logError('AdminLogin', res.error ?? 'Error desconocido')
      setError(res.error ?? 'Error al iniciar sesión')
      setEntrando(false)
      return
    }

    navigate('/panel', { replace: true })
  }

  if (verificando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-950 px-6 py-12">
        <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-8 text-center">
          <p className="text-sm text-navy-400">Verificando sesión…</p>
        </div>
      </div>
    )
  }

  if (yaLogueado) {
    return <Navigate to="/panel" replace />
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-navy-950 px-6 py-12">
      {/* Fondo de rayos solo en el login del administrador */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-60">
        <Lightning hue={260} xOffset={0} speed={1.2} intensity={1.1} size={1.2} />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-navy-950/40 via-transparent to-navy-950" />
      <div className="relative z-10 mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-white/10 bg-navy-900/80 p-8 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-500 text-3xl">
            🔐
          </span>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
            Acceso restringido
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white">Superadministrador</h1>
          <p className="mt-1 text-sm text-navy-400">
            Inicia sesión para acceder al Centro de Control.
          </p>
        </div>

        <label className="mt-8 block text-xs font-semibold uppercase tracking-[0.25em] text-navy-300">
          Correo
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@ejemplo.com"
          className="mt-2 w-full rounded-xl border border-white/10 bg-navy-800 px-4 py-3.5 text-white placeholder:text-navy-500 focus:border-gold-500/50 focus:outline-none"
        />

        <label className="mt-5 block text-xs font-semibold uppercase tracking-[0.25em] text-navy-300">
          Contraseña
        </label>
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && entrar()}
          placeholder="Tu contraseña"
        />

        {error && (
          <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-center text-sm text-red-400">
            {error}
          </p>
        )}

        <button
          onClick={entrar}
          disabled={entrando}
          className="mt-4 w-full rounded-xl bg-gold-500 py-4 text-base font-bold text-navy-900 transition hover:bg-gold-400 active:scale-[0.98] disabled:opacity-50"
        >
          {entrando ? 'Ingresando…' : 'Entrar al panel'}
        </button>

        <p className="mt-5 text-center text-xs leading-relaxed text-navy-500">
          Solo el correo autorizado puede acceder. <Link to="/" className="text-gold-400 hover:underline">Volver al inicio</Link>
        </p>
      </div>
      </div>
    </div>
  )
}
