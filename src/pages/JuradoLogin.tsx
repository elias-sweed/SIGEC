import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getSupabase } from '../lib/supabase'
import PasswordInput from '../components/form/PasswordInput'
import { emailDeJurado, marcarEnSesion, obtenerJuradoPorCodigo } from '../services/jurado.service'
import { estaActivadoLocal, guardarSesionJurado, leerSesionJurado } from '../utils/session'
import { logConsulta, logError } from '../utils/devlog'
import type { Evento, Jurado } from '../types/database'

export default function JuradoLogin() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [codigo, setCodigo] = useState((params.get('codigo') ?? '').toUpperCase())
  const [jurado, setJurado] = useState<Jurado | null>(null)
  const [password, setPassword] = useState('')
  const [evento, setEvento] = useState<Evento | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [verificando, setVerificando] = useState(false)

  useEffect(() => {
    const c = params.get('codigo')
    if (c) setCodigo(c.toUpperCase())
  }, [params])

  useEffect(() => {
    if (leerSesionJurado()) {
      navigate('/jurado/evaluacion', { replace: true })
      return
    }

    ;(async () => {
      const supabase = getSupabase()
      logConsulta('JuradoLogin: obtener evento')
      const { data, error } = await supabase
        .from('eventos')
        .select('*')
        .order('created_at')
        .limit(1)
        .maybeSingle()
      if (error) logError('JuradoLogin evento', error.message)
      if (data) setEvento(data as Evento)
    })()
  }, [navigate])

  const verificarCodigo = async () => {
    const codigoLimpio = codigo.trim().toUpperCase()
    if (!codigoLimpio) {
      setError('Ingresa tu código de jurado')
      return
    }
    setVerificando(true)
    setError(null)

    const j = await obtenerJuradoPorCodigo(codigoLimpio)
    if (!j) {
      setError('Código no válido.')
      setVerificando(false)
      return
    }

    if (!j.activado && !estaActivadoLocal(codigoLimpio)) {
      navigate(`/jurado/activar?codigo=${codigoLimpio}`, { replace: true })
      return
    }

    setJurado(j)
    setVerificando(false)
  }

  const ingresar = async () => {
    if (!jurado || !password) {
      setError('Ingresa tu contraseña')
      return
    }
    setVerificando(true)
    setError(null)

    const supabase = getSupabase()
    const email = emailDeJurado(jurado.codigo)
    logConsulta(`JuradoLogin: autenticar ${email}`)
    const { error: errAuth } = await supabase.auth.signInWithPassword({ email, password })

    if (errAuth) {
      logError('JuradoLogin signIn', errAuth.message)
      const msg = errAuth.message.toLowerCase()
      const esConfirmacion = msg.includes('confirm') || msg.includes('not_confirmed')
      setError(
        esConfirmacion
          ? 'Confirma la activación en el panel antes de ingresar.'
          : 'Contraseña incorrecta. Intenta de nuevo.',
      )
      setVerificando(false)
      return
    }

    guardarSesionJurado(jurado.id, jurado.codigo)
    await marcarEnSesion(jurado.id, true)
    logConsulta(`JuradoLogin: sesión iniciada para ${jurado.codigo}`)

    navigate('/jurado/evaluacion', { replace: true })
  }

  const volver = () => {
    setJurado(null)
    setPassword('')
    setError(null)
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-8 shadow-2xl">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-500 text-3xl">
          🏆
        </span>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
          Acceso del jurado
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">
          {evento?.nombre ?? 'Certamen de danza'}
        </h1>
        {evento && <p className="mt-1 text-sm text-navy-400">Etapa: {evento.etapa}</p>}
      </div>

      {!jurado ? (
        <>
          <label className="mt-8 block text-xs font-semibold uppercase tracking-[0.25em] text-navy-300">
            Código del jurado
          </label>
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && verificarCodigo()}
            placeholder="JUR-001"
            className="mt-2 w-full rounded-xl border border-white/10 bg-navy-800 px-4 py-4 text-center font-mono text-2xl font-bold uppercase tracking-[0.2em] text-white placeholder:text-navy-500 focus:border-gold-500/50 focus:outline-none"
          />

          {error && (
            <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-center text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            onClick={verificarCodigo}
            disabled={verificando}
            className="mt-4 w-full rounded-xl bg-gold-500 py-4 text-base font-bold text-navy-900 transition hover:bg-gold-400 active:scale-[0.98] disabled:opacity-50"
          >
            {verificando ? 'Validando…' : 'Continuar'}
          </button>

          <p className="mt-5 text-center text-xs leading-relaxed text-navy-500">
            Escanea tu QR o ingresa tu código para acceder.
          </p>
        </>
      ) : (
        <>
          <div className="mt-6 rounded-xl border border-white/10 bg-navy-800/50 px-4 py-3 text-center">
            <p className="text-sm font-semibold text-white">{jurado.nombre}</p>
            <p className="font-mono text-xs font-bold text-gold-400">{jurado.codigo}</p>
            <p className="mt-1 text-xs text-navy-400">{emailDeJurado(jurado.codigo)}</p>
          </div>

          <label className="mt-5 block text-xs font-semibold uppercase tracking-[0.25em] text-navy-300">
            Contraseña
          </label>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ingresar()}
            placeholder="Tu contraseña"
            autoFocus
          />

          {error && (
            <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-center text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            onClick={ingresar}
            disabled={verificando}
            className="mt-4 w-full rounded-xl bg-gold-500 py-4 text-base font-bold text-navy-900 transition hover:bg-gold-400 active:scale-[0.98] disabled:opacity-50"
          >
            {verificando ? 'Ingresando…' : 'Ingresar'}
          </button>

          <button
            onClick={volver}
            className="mt-2 w-full rounded-xl border border-white/10 py-3 text-sm font-semibold text-navy-300 transition hover:bg-navy-800 hover:text-white"
          >
            ← Usar otro código
          </button>
        </>
      )}
    </div>
  )
}