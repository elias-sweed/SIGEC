import { useState } from 'react'
import { Link } from 'react-router-dom'
import PanelHeader from '../../components/admin/PanelHeader'
import Section from '../../components/admin/Section'
import { usePanelData } from '../../context/PanelDataContext'
import { useCertamen } from '../../context/CertamenContext'
import { getSupabase } from '../../lib/supabase'
import { resetCertamen } from '../../services/reset.service'
import { logConsulta, logError } from '../../utils/devlog'
import { EVENT_STATE_LABELS } from '../../constants/eventStates'

interface ItemChecklist {
  clave: string
  label: string
  ok: boolean
}

export default function Resumen() {
  const { evento, candidatas, jurados, criterios, recargar } = usePanelData()
  const { estadoEvento, candidataActual } = useCertamen()

  const [error, setError] = useState<string | null>(null)
  const [iniciando, setIniciando] = useState(false)
  const [reiniciando, setReiniciando] = useState(false)

  const etapa = evento?.etapa ?? ''
  const criteriosEtapa = criterios.filter((c) => c.etapa === etapa)

  const checklist: ItemChecklist[] = [
    { clave: 'evento', label: 'Evento creado', ok: !!evento },
    { clave: 'candidatas', label: 'Candidatas registradas', ok: candidatas.length > 0 },
    { clave: 'jurados', label: 'Jurados registrados', ok: jurados.length > 0 },
    { clave: 'criterios', label: 'Criterios oficiales cargados', ok: criteriosEtapa.length > 0 },
  ]
  const completo = checklist.every((i) => i.ok)
  const evaluando = estadoEvento?.estado === 'evaluando'

  const iniciarEvaluacion = async () => {
    if (!evento || candidatas.length === 0) return
    setIniciando(true)
    setError(null)
    const supabase = getSupabase()

    const candidataInicial = candidatas[0]

    logConsulta('Panel: marcando evento como evaluando')
    const { error: errEvento } = await supabase
      .from('eventos')
      .update({ estado: 'evaluando' })
      .eq('id', evento.id)
    if (errEvento) {
      logError('iniciar evento', errEvento.message)
      setError(errEvento.message)
      setIniciando(false)
      return
    }

    if (estadoEvento) {
      logConsulta('Panel: actualizando estado_evento a evaluando')
      const { error } = await supabase
        .from('estado_evento')
        .update({
          candidata_actual_id: candidataInicial.id,
          estado: 'evaluando',
          updated_at: new Date().toISOString(),
        })
        .eq('evento_id', evento.id)
      if (error) {
        logError('iniciar estado_evento', error.message)
        setError(error.message)
        setIniciando(false)
        return
      }
    } else {
      logConsulta('Panel: creando estado_evento (evaluando)')
      const { error } = await supabase.from('estado_evento').insert({
        evento_id: evento.id,
        candidata_actual_id: candidataInicial.id,
        estado: 'evaluando',
      })
      if (error) {
        logError('crear estado_evento', error.message)
        setError(error.message)
        setIniciando(false)
        return
      }
    }

    await recargar()
    setIniciando(false)
  }

  const reiniciarCertamen = async () => {
    if (!window.confirm('¿Seguro que quieres ELIMINAR todos los datos del certamen? Esta acción no se puede deshacer.')) {
      return
    }
    setReiniciando(true)
    setError(null)
    try {
      await resetCertamen()
      await recargar()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
    setReiniciando(false)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PanelHeader
        eyebrow="Centro de Control"
        title={evento?.nombre ?? 'Asistente de Certamen'}
        description="Prepara el certamen, gestiona jurados y candidatas, e inicia la evaluación."
      />

      {/* Banner de evaluación en curso */}
      {evaluando && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6 transition-all duration-500">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-400">
            Evaluación en curso
          </p>
          <p className="mt-2 text-lg font-bold text-white">{evento?.nombre ?? 'Certamen'}</p>
          <p className="mt-1 text-sm text-navy-200">
            Candidata activa:{' '}
            <strong className="text-white">{candidataActual?.nombre ?? '—'}</strong>
          </p>
          <Link
            to="/jurado"
            className="mt-4 inline-block rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-navy-900 transition hover:bg-gold-400"
          >
            Abrir acceso del jurado →
          </Link>
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
      )}

      {/* Checklist + Iniciar */}
      <Section
        titulo="Checklist de configuración"
        descripcion={`Etapa actual: ${etapa || '—'} · Estado: ${
          evento
            ? (EVENT_STATE_LABELS[evento.estado as keyof typeof EVENT_STATE_LABELS] ?? evento.estado)
            : '—'
        }`}
        completado={completo}
      >
        <div className="flex items-start justify-between gap-4">
          <ul className="grid flex-1 gap-2 sm:grid-cols-2">
            {checklist.map((item) => (
              <li
                key={item.clave}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-300 ${
                  item.ok ? 'bg-emerald-500/10 text-emerald-300' : 'bg-navy-800/60 text-navy-300'
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                    item.ok ? 'bg-emerald-500 text-navy-950' : 'border border-navy-600 text-transparent'
                  }`}
                >
                  ✔
                </span>
                {item.label}
                <span className="ml-auto text-xs uppercase opacity-70">
                  {item.ok ? 'Listo' : 'Pendiente'}
                </span>
              </li>
            ))}
          </ul>
          <button
            onClick={reiniciarCertamen}
            disabled={reiniciando}
            className="shrink-0 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
          >
            {reiniciando ? 'Reiniciando…' : 'Reiniciar Certamen'}
          </button>
        </div>

        <div className="mt-6 border-t border-white/5 pt-5">
          {evaluando ? (
            <p className="text-center text-sm font-semibold text-emerald-400">
              ✓ Certamen iniciado — la evaluación ya está activa.
            </p>
          ) : (
            <>
              <button
                onClick={iniciarEvaluacion}
                disabled={!completo || iniciando}
                className="w-full rounded-2xl bg-gold-500 py-4 text-lg font-bold text-navy-900 transition hover:bg-gold-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
              >
                {iniciando ? 'Iniciando…' : 'Iniciar Evaluación'}
              </button>
              {!completo && (
                <p className="mt-3 text-center text-xs text-navy-400">
                  Completa todos los pasos para habilitar el inicio.
                </p>
              )}
            </>
          )}
        </div>
      </Section>

      {/* Jurados conectados */}
      <Section
        titulo="Jurados conectados"
        descripcion="Estado en vivo de los jurados registrados"
        completado={jurados.length > 0}
      >
        {jurados.length === 0 ? (
          <p className="text-sm text-navy-500">Sin jurados registrados todavía.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {jurados.map((j) => (
              <li
                key={j.id}
                className="flex items-center justify-between rounded-lg bg-navy-800/50 px-3 py-2.5 text-sm"
              >
                <span className="font-mono text-xs font-bold text-gold-400">{j.codigo}</span>
                <span className="flex-1 truncate px-3 text-left text-white">{j.nombre}</span>
                <div className="flex shrink-0 items-center gap-2">
                  {j.en_sesion && (
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                      ● En sesión
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      j.activado ? 'bg-emerald-500/15 text-emerald-400' : 'bg-navy-600/40 text-navy-400'
                    }`}
                  >
                    {j.activado ? '✔ Activado' : 'Pendiente'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}