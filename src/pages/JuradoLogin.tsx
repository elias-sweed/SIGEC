import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSupabase } from '../lib/supabase'
import { guardarSesionJurado, leerSesionJurado } from '../utils/session'
import { logConsulta, logError } from '../utils/devlog'
import type { Evento, Jurado } from '../types/database'

export default function JuradoLogin() {
  const navigate = useNavigate()

  const [codigo, setCodigo] = useState('')
  const [evento, setEvento] = useState<Evento | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [verificando, setVerificando] = useState(false)

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

  const ingresar = async () => {
    const codigoLimpio = codigo.trim().toUpperCase()
    if (!codigoLimpio) {
      setError('Ingresa tu código de jurado')
      return
    }
    setVerificando(true)
    setError(null)

    const supabase = getSupabase()
    logConsulta(`JuradoLogin: validar código ${codigoLimpio}`)
    const { data, error } = await supabase
      .from('jurados')
      .select('*')
      .eq('codigo', codigoLimpio)
      .maybeSingle()

    if (error) {
      logError('JuradoLogin validar', error.message)
      setError('No se pudo validar el código. Intenta de nuevo.')
      setVerificando(false)
      return
    }

    if (!data) {
      setError('Código no válido.')
      setVerificando(false)
      return
    }

    const jurado = data as Jurado
    guardarSesionJurado(jurado.id, jurado.codigo)
    logConsulta(`JuradoLogin: sesión iniciada para ${jurado.codigo}`)
    await supabase.from('jurados').update({ en_sesion: true }).eq('id', jurado.id)

    navigate('/jurado/evaluacion', { replace: true })
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

      <label className="mt-8 block text-xs font-semibold uppercase tracking-[0.25em] text-navy-300">
        Código del jurado
      </label>
      <input
        value={codigo}
        onChange={(e) => setCodigo(e.target.value.toUpperCase())}
        onKeyDown={(e) => e.key === 'Enter' && ingresar()}
        placeholder="JUR-001"
        className="mt-2 w-full rounded-xl border border-white/10 bg-navy-800 px-4 py-4 text-center font-mono text-2xl font-bold uppercase tracking-[0.2em] text-white placeholder:text-navy-500 focus:border-gold-500/50 focus:outline-none"
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
        {verificando ? 'Validando…' : 'Ingresar'}
      </button>

      <p className="mt-5 text-center text-xs leading-relaxed text-navy-500">
        El administrador te entregó este código al inicio del certamen.
      </p>
    </div>
  )
}