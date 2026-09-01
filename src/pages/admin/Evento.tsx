import { useState } from 'react'
import PanelHeader from '../../components/admin/PanelHeader'
import Section from '../../components/admin/Section'
import { usePanelData } from '../../context/PanelDataContext'
import { getSupabase } from '../../lib/supabase'
import { logConsulta, logError } from '../../utils/devlog'
import { ETAPAS } from '../../constants/criteriosOficiales'
import { EVENT_STATE_LABELS } from '../../constants/eventStates'

export default function Evento() {
  const { evento, recargar } = usePanelData()

  const [nombre, setNombre] = useState('')
  const [etapa, setEtapa] = useState<string>(ETAPAS[0])
  const [error, setError] = useState<string | null>(null)

  const crear = async () => {
    if (!nombre.trim()) {
      setError('Ingresa el nombre del evento')
      return
    }
    const supabase = getSupabase()
    logConsulta('Panel: crear evento')
    const { error } = await supabase.from('eventos').insert({
      nombre: nombre.trim(),
      etapa,
      estado: 'preparando',
    })
    if (error) {
      logError('crear evento', error.message)
      setError(error.message)
      return
    }
    setError(null)
    setNombre('')
    await recargar()
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PanelHeader
        eyebrow="Configuración"
        title="Evento"
        description="Define el nombre y la etapa del certamen. Sin evento no se puede iniciar la evaluación."
      />

      <Section
        titulo="Datos del evento"
        descripcion="Nombre oficial y etapa competitiva"
        completado={!!evento}
      >
        {evento ? (
          <div className="rounded-xl border border-white/10 bg-navy-800/50 px-4 py-3">
            <p className="font-semibold text-white">{evento.nombre}</p>
            <p className="mt-1 text-sm text-navy-300">
              Etapa: <span className="text-gold-400">{evento.etapa}</span> · Estado:{' '}
              <span className="text-gold-400">
                {EVENT_STATE_LABELS[evento.estado as keyof typeof EVENT_STATE_LABELS] ?? evento.estado}
              </span>
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              placeholder="Nombre del certamen (ej: Gran Final Nacional 2026)"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-navy-800 px-3 py-2 text-sm text-white placeholder:text-navy-500"
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-navy-400">Etapa:</span>
              {ETAPAS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEtapa(e)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    etapa === e
                      ? 'bg-gold-500 text-navy-900'
                      : 'bg-navy-800 text-navy-300 hover:bg-navy-700'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
            {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
            <button
              onClick={crear}
              className="w-full rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-navy-900 transition hover:bg-gold-400"
            >
              Crear evento
            </button>
          </div>
        )}
      </Section>
    </div>
  )
}