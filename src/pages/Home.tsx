import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import DebugPanel from '../components/DebugPanel'
import { useCertamen } from '../context/CertamenContext'
import { getSupabase } from '../lib/supabase'
import { logConsulta, logFilas, logError } from '../utils/devlog'
import type { Evento } from '../types/database'

interface ConteoTabla {
  eventos: number
  candidatas: number
  jurados: number
  criterios: number
}

export default function Home() {
  const { eventoCandidato } = useCertamen()
  const [evento, setEvento] = useState<Evento | null>(eventoCandidato)
  const [conectado, setConectado] = useState<boolean | null>(null)
  const [conteos, setConteos] = useState<ConteoTabla>({
    eventos: 0,
    candidatas: 0,
    jurados: 0,
    criterios: 0,
  })

  useEffect(() => {
    if (eventoCandidato) {
      setEvento(eventoCandidato)
      return
    }
    ;(async () => {
      try {
        const supabase = getSupabase()
        logConsulta('Home: obtener primer evento')
        const { data } = await supabase
          .from('eventos')
          .select('*')
          .order('created_at')
          .limit(1)
          .maybeSingle()
        setEvento((data as Evento | null) ?? null)
      } catch {
        // El DebugPanel mostrará el error
      }
    })()
  }, [eventoCandidato])

  useEffect(() => {
    ;(async () => {
      try {
        const supabase = getSupabase()

        const [ev, ca, ju, cr] = await Promise.all([
          supabase.from('eventos').select('*', { count: 'exact', head: true }),
          supabase.from('candidatas').select('*', { count: 'exact', head: true }),
          supabase.from('jurados').select('*', { count: 'exact', head: true }),
          supabase.from('criterios').select('*', { count: 'exact', head: true }),
        ])

        if (ev.error || ca.error || ju.error || cr.error) {
          logError('Home conteos', [ev.error?.message, ca.error?.message, ju.error?.message, cr.error?.message].filter(Boolean).join('; '))
          setConectado(false)
          return
        }

        setConectado(true)
        const nuevosConteos = {
          eventos: ev.count ?? 0,
          candidatas: ca.count ?? 0,
          jurados: ju.count ?? 0,
          criterios: cr.count ?? 0,
        }
        setConteos(nuevosConteos)
        logFilas('Home conteos', [nuevosConteos])
      } catch (err) {
        logError('Home conteos', err instanceof Error ? err.message : String(err))
        setConectado(false)
      }
    })()
  }, [])

  const tarjetas = useMemo(
    () => [
      {
        to: '/maestro',
        titulo: 'Panel Maestro',
        descripcion: 'Centro de control: selecciona candidatas, gestiona criterios y administra el evento.',
        icono: '⚙',
        etiqueta: 'Administrar',
      },
      {
        to: '/jurado',
        titulo: 'Panel del Jurado',
        descripcion: 'Evaluación de la candidata activa: criterios dinámicos, sliders y guardado.',
        icono: '⚖',
        etiqueta: 'Evaluar',
      },
      {
        to: '/publico',
        titulo: 'Pantalla Pública',
        descripcion: 'Proyección del evento para la audiencia: candidata actual y estado.',
        icono: '📺',
        etiqueta: 'Ver',
      },
    ],
    [],
  )

  const entradasConteo: [string, number][] = [
    ['Eventos', conteos.eventos],
    ['Candidatas', conteos.candidatas],
    ['Jurados', conteos.jurados],
    ['Criterios', conteos.criterios],
  ]

  return (
    <div className="space-y-10">
      <div className="relative text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-[-6rem] mx-auto h-[400px] max-w-4xl bg-[radial-gradient(closest-side,rgba(201,162,39,0.16),transparent)]"
        />
        <p className="relative mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-gold-400">
          Certamen de Danza
        </p>
        <h1 className="relative text-4xl font-bold tracking-tight text-white sm:text-6xl">
          Bienvenido a <span className="text-gold-400">SIGEC</span>
        </h1>
        <p className="relative mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-navy-200">
          Sistema Integral de Gestión y Evaluación del Certamen. Centraliza la evaluación del jurado
          y la difusión de resultados en una sola plataforma.
        </p>
      </div>

      <DebugPanel conectado={conectado} />

      <section className="mx-auto max-w-2xl rounded-xl border border-white/10 bg-navy-900/70 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">
          Resumen de tablas
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
          {entradasConteo.map(([nombre, cantidad]) => (
            <div key={nombre} className="rounded-lg bg-navy-800/60 p-3">
              <p className={`text-2xl font-bold ${cantidad === 0 ? 'text-navy-400' : 'text-white'}`}>
                {cantidad}
              </p>
              <p className="mt-0.5 text-xs text-navy-300">{nombre} encontrados</p>
            </div>
          ))}
        </div>
      </section>

      {evento && (
        <div className="mx-auto max-w-xl rounded-xl border border-white/10 bg-navy-900/70 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">
            Evento actual
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">{evento.nombre}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-gold-500/15 px-2.5 py-1 text-xs font-semibold text-gold-300">
              Etapa: {evento.etapa}
            </span>
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
              {evento.estado}
            </span>
          </div>
        </div>
      )}

      <section className="grid gap-6 md:grid-cols-3">
        {tarjetas.map((tarjeta) => (
          <Link
            key={tarjeta.to}
            to={tarjeta.to}
            className="group block rounded-xl border border-white/10 bg-navy-900/70 p-6 transition-colors hover:border-gold-500/50"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gold-500/15 text-lg text-gold-400 transition-colors group-hover:bg-gold-500 group-hover:text-navy-950">
              {tarjeta.icono}
            </span>
            <h2 className="mt-4 text-lg font-semibold text-white">{tarjeta.titulo}</h2>
            <p className="mt-2 text-sm leading-relaxed text-navy-200">{tarjeta.descripcion}</p>
            <span className="mt-4 inline-block text-sm font-semibold text-gold-400 transition-colors group-hover:text-gold-300">
              {tarjeta.etiqueta} →
            </span>
          </Link>
        ))}
      </section>
    </div>
  )
}
