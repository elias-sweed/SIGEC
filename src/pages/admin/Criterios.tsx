import { useState } from 'react'
import PanelHeader from '../../components/admin/PanelHeader'
import Section from '../../components/admin/Section'
import { usePanelData } from '../../context/PanelDataContext'
import { getSupabase } from '../../lib/supabase'
import { logConsulta, logError } from '../../utils/devlog'
import { CRITERIOS_OFICIALES } from '../../constants/criteriosOficiales'

export default function Criterios() {
  const { evento, criterios, reglamentos, recargar } = usePanelData()

  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const etapa = evento?.etapa ?? ''
  const criteriosEtapa = criterios.filter((c) => c.etapa === etapa)
  const oficiales = CRITERIOS_OFICIALES[etapa]
  const reglamento = reglamentos.find((r) => r.etapa === etapa)?.contenido ?? null

  const cargar = async () => {
    if (!etapa || !oficiales) return
    setCargando(true)
    const supabase = getSupabase()
    logConsulta(`Panel: cargar criterios oficiales para etapa "${etapa}"`)
    const { error } = await supabase.from('criterios').upsert(
      oficiales.map((c, i) => ({
        etapa,
        nombre: c.nombre,
        puntaje_maximo: c.puntaje_maximo,
        indicadores: c.indicadores,
        orden: i + 1,
      })),
      { onConflict: 'etapa,orden' },
    )
    if (error) {
      logError('cargar criterios', error.message)
      setError(error.message)
    }
    setCargando(false)
    setError(null)
    await recargar()
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PanelHeader
        eyebrow="Configuración"
        title="Criterios"
        description="Carga los criterios oficiales de evaluación según la etapa del certamen."
      />

      {!etapa ? (
        <p className="rounded-2xl border border-white/10 bg-navy-900/70 p-6 text-sm text-navy-500">
          Primero crea el evento para definir la etapa.
        </p>
      ) : (
        <>
          <Section
            titulo="Criterios oficiales"
            descripcion={`Etapa actual: ${etapa}`}
            completado={criteriosEtapa.length > 0}
          >
          {error && <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
          <div className="rounded-xl border border-white/10 bg-navy-800/40 p-3 text-xs leading-relaxed text-navy-300">
            Los criterios oficiales para la etapa <strong className="text-gold-300">{etapa}</strong>{' '}
            se insertarán en la base de datos.
          </div>
          <button
            onClick={cargar}
            disabled={
              cargando ||
              (criteriosEtapa.length > 0 &&
                !criterios.some((c) => c.etapa === etapa && c.orden === oficiales?.length))
            }
            className="btn-gold mt-3 w-full"
          >
            {cargando ? 'Cargando…' : 'Cargar criterios oficiales'}
          </button>

          {criteriosEtapa.length > 0 ? (
            <ul className="mt-4 space-y-1.5">
              {criteriosEtapa.map((c) => (
                <li
                  key={c.id}
                  className="fila-panel text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-white">
                      <span className="text-navy-500">#{c.orden} </span>
                      {c.nombre}
                    </span>
                    <span className="shrink-0 font-mono text-xs font-bold text-gold-300">
                      {c.puntaje_maximo} pts
                    </span>
                  </div>
                  {c.indicadores && (
                    <p className="mt-1.5 border-t border-white/10 pt-1.5 text-xs leading-relaxed text-navy-400">
                      {c.indicadores}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-center text-sm text-navy-400/80">Sin criterios cargados todavía.</p>
          )}
        </Section>

        {reglamento && (
          <Section
            titulo={`Reglamento · ${etapa}`}
            descripcion="Disposiciones oficiales de la etapa (cargado desde la base de datos)"
            completado={!!reglamento}
          >
            <div className="whitespace-pre-line rounded-xl border border-white/10 bg-navy-800/40 p-4 text-sm leading-relaxed text-navy-200">
              {reglamento}
            </div>
          </Section>
        )}
        </>
      )}
    </div>
  )
}