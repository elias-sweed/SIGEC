import { useEffect, useState } from 'react'
import { getSupabase } from '../lib/supabase'
import { logConsulta, logError } from '../utils/devlog'

interface DebugPanelProps {
  conectado: boolean | null
}

export default function DebugPanel({ conectado }: DebugPanelProps) {
  const [urlSupabase, setUrlSupabase] = useState(false)
  const [keySupabase, setKeySupabase] = useState(false)
  const [countEventos, setCountEventos] = useState<number | null>(null)

  useEffect(() => {
    setUrlSupabase(!!import.meta.env.VITE_SUPABASE_URL)
    setKeySupabase(!!import.meta.env.VITE_SUPABASE_ANON_KEY)
  }, [])

  useEffect(() => {
    if (!urlSupabase || !keySupabase) return
    ;(async () => {
      try {
        const supabase = getSupabase()
        logConsulta('DebugPanel: eventos count')
        const { count, error } = await supabase
          .from('eventos')
          .select('*', { count: 'exact', head: true })
        if (error) {
          logError('DebugPanel', error.message)
          setCountEventos(0)
        } else {
          setCountEventos(count ?? 0)
        }
      } catch (err) {
        logError('DebugPanel', err instanceof Error ? err.message : String(err))
        setCountEventos(0)
      }
    })()
  }, [urlSupabase, keySupabase])

  const dominio = (() => {
    try {
      const raw = import.meta.env.VITE_SUPABASE_URL
      return raw ? new URL(raw).hostname : '(no configurado)'
    } catch {
      return '(URL inválida)'
    }
  })()

  return (
    <section className="rounded-xl border border-white/10 bg-navy-900/70 p-5">
      <h3 className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">
        Panel de diagnóstico
      </h3>

      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-lg bg-navy-800/60 p-3">
          <p className="text-navy-400">URL detectada</p>
          <p className="mt-0.5 font-medium text-white break-all">{dominio}</p>
        </div>
        <div className="rounded-lg bg-navy-800/60 p-3">
          <p className="text-navy-400">VITE_SUPABASE_URL</p>
          <p className="mt-0.5 font-semibold">{urlSupabase ? '✅ Configurada' : '❌ No existe'}</p>
        </div>
        <div className="rounded-lg bg-navy-800/60 p-3">
          <p className="text-navy-400">VITE_SUPABASE_ANON_KEY</p>
          <p className="mt-0.5 font-semibold">{keySupabase ? '✅ Configurada' : '❌ No existe'}</p>
        </div>
      </div>

      <div className="mt-3 rounded-lg bg-navy-800/60 p-3 text-sm">
        <p className="text-navy-400">Estado de conexión</p>
        <p className="mt-0.5 font-semibold">
          {conectado === null && '⏳ Verificando…'}
          {conectado === true && '✅ Conectado — eventos encontrados: '}
          {conectado === true && (
            <span className="font-bold text-gold-300">{countEventos ?? '…'}</span>
          )}
          {conectado === false && '❌ Error al conectar con Supabase — revisa .env y la estructura de tablas.'}
        </p>
      </div>
    </section>
  )
}
