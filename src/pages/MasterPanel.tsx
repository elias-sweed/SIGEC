import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { useCertamen } from '../context/CertamenContext'
import { getSupabase } from '../lib/supabase'
import type { Candidata, Evento } from '../types/database'

export default function MasterPanel() {
  const { eventoCandidato, candidataActual, estadoEvento, cargando, actualizarCandidata } =
    useCertamen()
  const [evento, setEvento] = useState<Evento | null>(eventoCandidato)
  const [candidatas, setCandidatas] = useState<Candidata[]>([])
  const [error, setError] = useState<string | null>(null)
  const [seleccionando, setSeleccionando] = useState<string | null>(null)

  useEffect(() => {
    setEvento(eventoCandidato)
  }, [eventoCandidato])

  useEffect(() => {
    async function cargarCandidatas() {
      try {
        const supabase = getSupabase()
        const { data, error: errLista } = await supabase
          .from('candidatas')
          .select('*')
          .order('nombre')
        if (errLista) throw errLista
        setCandidatas((data ?? []) as Candidata[])
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo conectar con Supabase. Verifica tu archivo .env.',
        )
      }
    }

    cargarCandidatas()
  }, [])

  async function handleSeleccionar(candidataId: string) {
    setSeleccionando(candidataId)
    setError(null)
    try {
      await actualizarCandidata(candidataId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el estado del evento.')
    } finally {
      setSeleccionando(null)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Organización"
        title="Panel Maestro"
        description="Selecciona la candidata activa que el jurado evaluará. La selección se sincroniza automáticamente con el Panel del Jurado."
      />

      {error && (
        <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-red-400/30 bg-red-400/10 px-5 py-3 text-center text-sm text-red-200">
          {error}
        </div>
      )}

      {cargando && (
        <div className="mx-auto mt-10 flex items-center justify-center gap-2 text-sm text-navy-300">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gold-500 border-t-transparent" />
          Cargando estado del evento…
        </div>
      )}

      {evento && (
        <section className="mx-auto mt-8 max-w-3xl rounded-xl border border-white/10 bg-navy-900/70 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">
                Evento actual
              </p>
              <h2 className="mt-1 text-xl font-bold text-white">{evento.nombre}</h2>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-gold-500/15 px-3 py-1 text-gold-300">
                Etapa: {evento.etapa}
              </span>
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-300">
                {evento.estado}
              </span>
            </div>
          </div>

          {candidataActual && (
            <div className="mt-4 rounded-lg border border-gold-500/25 bg-gold-500/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">
                Candidata seleccionada
              </p>
              <p className="mt-1 text-lg font-bold text-white">{candidataActual.nombre}</p>
              <p className="text-sm text-navy-300">
                {candidataActual.grado} · Sección {candidataActual.seccion}
              </p>
              {estadoEvento && (
                <p className="mt-1 text-xs text-navy-400">
                  Última actualización:{' '}
                  {new Date(estadoEvento.updated_at).toLocaleString('es-PE')}
                </p>
              )}
            </div>
          )}

          {!candidataActual && !cargando && (
            <div className="mt-4 rounded-lg border border-dashed border-navy-600 p-4 text-center">
              <p className="text-sm text-navy-300">
                Aún no se ha seleccionado ninguna candidata.
              </p>
            </div>
          )}
        </section>
      )}

      {candidatas.length > 0 && (
        <section className="mx-auto mt-6 max-w-3xl">
          <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-navy-200">
            Candidatas
          </h3>
          <ul className="mt-4 space-y-3">
            {candidatas.map((item) => {
              const activa = candidataActual?.id === item.id
              const procesando = seleccionando === item.id
              return (
                <li
                  key={item.id}
                  className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 transition-all ${
                    activa
                      ? 'border-gold-500 bg-gold-500/10 shadow-lg shadow-gold-500/5'
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
                    onClick={() => handleSeleccionar(item.id)}
                    disabled={activa || procesando}
                    className={
                      activa
                        ? 'inline-flex items-center gap-1.5 rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-navy-950'
                        : 'btn-outline'
                    }
                  >
                    {procesando ? (
                      <>
                        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Guardando…
                      </>
                    ) : activa ? (
                      'Seleccionada ✓'
                    ) : (
                      'Seleccionar'
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {!error && candidatas.length === 0 && !cargando && (
        <p className="mt-8 text-center text-sm text-navy-300">
          Aplica las migraciones y el seed en Supabase para ver las candidatas aquí.
        </p>
      )}

      <div className="mt-10 text-center">
        <Link to="/jurado" className="btn-outline">
          Ir al Panel del Jurado →
        </Link>
      </div>
    </>
  )
}
