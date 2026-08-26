import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCertamen } from '../context/CertamenContext'
import { getSupabase } from '../lib/supabase'
import type { Evento } from '../types/database'

export default function Home() {
  const { eventoCandidato } = useCertamen()
  const [evento, setEvento] = useState<Evento | null>(eventoCandidato)

  useEffect(() => {
    if (eventoCandidato) {
      setEvento(eventoCandidato)
      return
    }
    ;(async () => {
      try {
        const { data } = await getSupabase()
          .from('eventos')
          .select('*')
          .order('created_at')
          .limit(1)
          .maybeSingle()
        setEvento((data as Evento | null) ?? null)
      } catch {
        // La app sigue funcionando sin evento; el contexto lo manejará
      }
    })()
  }, [eventoCandidato])

  const tarjetas = useMemo(
    () => [
      {
        to: '/maestro',
        titulo: 'Panel Maestro',
        descripcion: 'Centro de control: evento, candidatas y selección de la participante activa.',
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
          Sistema Integral de Gestión y Evaluación del Certamen. Centraliza la evaluación del
          jurado y la difusión de resultados en una sola plataforma.
        </p>
      </div>

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
