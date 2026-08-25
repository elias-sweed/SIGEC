import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { useCertamen } from '../context/CertamenContext'
import { getSupabase } from '../lib/supabase'
import type { Candidata, Evento } from '../types/database'

export default function MasterPanel() {
  const { evento, setEvento, candidata, setCandidata } = useCertamen()
  const [candidatas, setCandidatas] = useState<Candidata[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function cargarDatos() {
      try {
        const supabase = getSupabase()

        let { data: eventoActual } = await supabase
          .from('eventos')
          .select('*')
          .eq('estado', 'activo')
          .order('created_at')
          .limit(1)
          .maybeSingle()

        if (!eventoActual) {
          const respuesta = await supabase
            .from('eventos')
            .select('*')
            .order('created_at')
            .limit(1)
            .maybeSingle()
          eventoActual = respuesta.data
        }

        if (eventoActual) setEvento(eventoActual as Evento)

        const { data: lista, error: errorLista } = await supabase
          .from('candidatas')
          .select('*')
          .order('nombre')

        if (errorLista) throw errorLista
        setCandidatas((lista ?? []) as Candidata[])
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo conectar con Supabase. Revisa tu archivo .env.',
        )
      }
    }

    cargarDatos()
  }, [setEvento])

  return (
    <>
      <PageHeader
        eyebrow="Organización"
        title="Panel Maestro"
        description="Centro de control del certamen. Selecciona la candidata que pasará al Panel del Jurado para su evaluación."
      />

      {error && (
        <div className="mx-auto mt-10 max-w-xl rounded-xl border border-red-400/30 bg-red-400/10 px-6 py-4 text-center text-sm text-red-200">
          {error}
        </div>
      )}

      {evento && (
        <section className="mx-auto mt-10 max-w-3xl rounded-xl border border-white/10 bg-navy-900/70 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">
                Evento actual
              </p>
              <h2 className="mt-1 text-xl font-semibold text-white">{evento.nombre}</h2>
            </div>
            <span className="rounded-full bg-gold-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gold-300">
              Etapa: {evento.etapa} · {evento.estado}
            </span>
          </div>
        </section>
      )}

      {!error && !evento && candidatas.length === 0 && (
        <p className="mt-10 text-center text-sm text-navy-300">
          Aplica las migraciones y el seed en Supabase para ver el evento y las candidatas aquí.
        </p>
      )}

      <section className="mx-auto mt-8 max-w-3xl">
        <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-navy-200">
          Candidatas
        </h3>
        <ul className="mt-4 space-y-3">
          {candidatas.map((item) => {
            const seleccionada = candidata?.id === item.id
            return (
              <li
                key={item.id}
                className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 transition-colors ${
                  seleccionada
                    ? 'border-gold-500 bg-gold-500/10'
                    : 'border-white/10 bg-navy-900/70'
                }`}
              >
                <div>
                  <p className="font-medium text-white">{item.nombre}</p>
                  <p className="text-sm text-navy-300">
                    {item.grado} · Sección {item.seccion}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCandidata(seleccionada ? null : item)}
                  className={seleccionada ? 'btn-primary' : 'btn-outline'}
                >
                  {seleccionada ? 'Seleccionada ✓' : 'Seleccionar candidata'}
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <div className="mt-10 text-center">
        <Link to="/jurado" className="btn-outline">
          Ir al Panel del Jurado →
        </Link>
      </div>
    </>
  )
}
