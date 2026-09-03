import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PanelHeader from '../../components/admin/PanelHeader'
import Section from '../../components/admin/Section'
import QRIngresoModal from '../../components/admin/QRIngresoModal'
import ReiniciarCertamenModal from '../../components/admin/ReiniciarCertamenModal'
import { usePanelData } from '../../context/PanelDataContext'
import { useCertamen } from '../../context/CertamenContext'
import { SectionSkeleton } from '../../components/Skeleton'
import { getSupabase } from '../../lib/supabase'
import { resetCertamen } from '../../services/reset.service'
import { logConsulta, logError } from '../../utils/devlog'
import { registrarAccion } from '../../utils/auditLog'
import { generarActaOficial } from '../../utils/actaPdf'
import { exportarResultadosExcel } from '../../utils/exportExcel'
import { descargarRespaldoJSON } from '../../utils/respaldo'
import { EVENT_STATE_LABELS, EVENT_STATE_COLORS, type EventState } from '../../constants/eventStates'

interface ItemChecklist {
  clave: string
  label: string
  ok: boolean
}

interface BotonConsola {
  estado: EventState
  etiqueta: string
  detalle: string
  deshabilitado: boolean
  accion: () => void
}

interface EstiloBoton {
  activo: string
  neutral: string
  dot: string
}

const estiloBoton: Record<EventState, EstiloBoton> = {
  preparando: {
    activo: 'border-slate-300/70 bg-slate-400/25 text-white ring-2 ring-slate-400/50',
    neutral: 'border-slate-500/30 bg-slate-500/10 text-slate-200 hover:border-slate-400/60 hover:bg-slate-500/20',
    dot: 'bg-slate-200',
  },
  evaluando: {
    activo: 'border-emerald-300/70 bg-emerald-500/25 text-white ring-2 ring-emerald-400/50',
    neutral: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100 hover:border-emerald-400/60 hover:bg-emerald-500/20',
    dot: 'bg-emerald-300',
  },
  resultados_listos: {
    activo: 'border-amber-300/70 bg-amber-500/25 text-white ring-2 ring-amber-400/50',
    neutral: 'border-amber-500/30 bg-amber-500/10 text-amber-100 hover:border-amber-400/60 hover:bg-amber-500/20',
    dot: 'bg-amber-300',
  },
  esperando_jurados: {
    activo: 'border-sky-300/70 bg-sky-500/25 text-white ring-2 ring-sky-400/50',
    neutral: 'border-sky-500/30 bg-sky-500/10 text-sky-100 hover:border-sky-400/60 hover:bg-sky-500/20',
    dot: 'bg-sky-300',
  },
  publicado: {
    activo: 'border-purple-300/70 bg-purple-500/25 text-white ring-2 ring-purple-400/50',
    neutral: 'border-purple-500/30 bg-purple-500/10 text-purple-100 hover:border-purple-400/60 hover:bg-purple-500/20',
    dot: 'bg-purple-300',
  },
}

function iniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function Resumen() {
  const { evento, candidatas, jurados, criterios, evaluaciones, detalles, cargandoInicial, recargar } = usePanelData()
  const { estadoEvento, candidataActual, actualizarCandidata } = useCertamen()

  const [error, setError] = useState<string | null>(null)
  const [operando, setOperando] = useState(false)
  const [reiniciando, setReiniciando] = useState(false)
  const [qrAbierto, setQrAbierto] = useState(false)
  const [resetAbierto, setResetAbierto] = useState(false)
  const [exportando, setExportando] = useState(false)
  const [ahora, setAhora] = useState(() => new Date())

  useEffect(() => {
    const reloj = setInterval(() => setAhora(new Date()), 1000)
    return () => clearInterval(reloj)
  }, [])

  const etapa = evento?.etapa ?? ''
  const estadoActual = (evento?.estado as EventState) || 'preparando'
  const criteriosEtapa = criterios.filter((c) => c.etapa === etapa)

  const checklist: ItemChecklist[] = [
    { clave: 'evento', label: 'Evento creado', ok: !!evento },
    { clave: 'candidatas', label: 'Candidatas registradas', ok: candidatas.length > 0 },
    { clave: 'jurados', label: 'Jurados registrados', ok: jurados.length > 0 },
    { clave: 'criterios', label: 'Criterios oficiales cargados', ok: criteriosEtapa.length > 0 },
  ]
  const completo = checklist.every((i) => i.ok)

  const totalCandidatas = candidatas.length

  // Progreso FIJO sobre todas las candidatas registradas: un jurado cuenta como
  // "listo" únicamente cuando completa la evaluación de las 45 (45/45).
  const evaluacionesCompletas = evaluaciones.filter(
    (ev) => ev.evento_id === evento?.id && ev.estado === 'completada' && !ev.es_ensayo,
  )
  const progresoJurados = jurados.map((j) => {
    const completadas = evaluacionesCompletas.filter((ev) => ev.jurado_id === j.id).length
    return { jurado: j, completadas, listo: totalCandidatas > 0 && completadas >= totalCandidatas }
  })
  const respondidos = progresoJurados.filter((p) => p.listo).length
  const respondieronTodos = jurados.length > 0 && respondidos === jurados.length
  const pctRespondidos =
    jurados.length > 0 && totalCandidatas > 0
      ? (progresoJurados.reduce((s, p) => s + Math.min(p.completadas, totalCandidatas), 0) /
          (jurados.length * totalCandidatas)) *
        100
      : 0

  const idx = candidatas.findIndex((c) => c.id === candidataActual?.id)
  const posicion = idx >= 0 ? idx + 1 : null

  const hora = ahora.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const fecha = ahora.toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const cambiarEstado = async (nuevo: EventState, conConfirmacion: boolean) => {
    if (conConfirmacion) {
      const confirmar = window.confirm(
        '¿Volver a Preparando? Se detiene la operación actual (jurados y pantalla pública).',
      )
      if (!confirmar) return
    }
    if (!evento) return

    setOperando(true)
    setError(null)
    const supabase = getSupabase()

    let candidataId = candidataActual?.id ?? null
    if (nuevo === 'evaluando') candidataId = candidataId ?? candidatas[0]?.id ?? null
    if (nuevo === 'preparando') candidataId = null

    logConsulta(`Panel: eventos.estado -> ${nuevo}`)
    const { error: errEvento } = await supabase
      .from('eventos')
      .update({ estado: nuevo })
      .eq('id', evento.id)
    if (errEvento) {
      logError('cambiar estado evento', errEvento.message)
      setError(errEvento.message)
      setOperando(false)
      return
    }

    if (estadoEvento) {
      logConsulta(`Panel: estado_evento -> ${nuevo}`)
      const { error } = await supabase
        .from('estado_evento')
        .update({
          estado: nuevo,
          candidata_actual_id: candidataId,
          updated_at: new Date().toISOString(),
        })
        .eq('evento_id', evento.id)
      if (error) {
        logError('cambiar estado_evento', error.message)
        setError(error.message)
        setOperando(false)
        return
      }
    } else {
      logConsulta(`Panel: creando estado_evento (${nuevo})`)
      const { error } = await supabase.from('estado_evento').insert({
        evento_id: evento.id,
        estado: nuevo,
        candidata_actual_id: candidataId,
      })
      if (error) {
        logError('crear estado_evento', error.message)
        setError(error.message)
        setOperando(false)
        return
      }
    }

    await recargar()
    setOperando(false)
    const labels: Record<string, string> = {
      preparando: 'Reinicio a preparando',
      evaluando: 'Inicio de evaluación',
      resultados_listos: 'Cierre de evaluación',
      publicado: 'Publicación de resultados',
    }
    await registrarAccion('Operador', `estado_${nuevo}`, labels[nuevo] ?? nuevo)
  }

  const navegarCandidata = async (direccion: -1 | 1) => {
    if (!candidataActual || idx < 0) return
    const destino = candidatas[idx + direccion]
    if (!destino) return
    try {
      await actualizarCandidata(destino.id)
      await registrarAccion('Operador', 'cambiar_candidata', `Candidata: ${destino.nombre}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const toggleModoEnsayo = async () => {
    if (!evento || !estadoEvento) return
    setOperando(true)
    setError(null)
    const nuevo = !estadoEvento.modo_ensayo
    const { error } = await getSupabase()
      .from('estado_evento')
      .update({ modo_ensayo: nuevo, updated_at: new Date().toISOString() })
      .eq('evento_id', evento.id)
    if (error) {
      setError(error.message)
      setOperando(false)
      return
    }
    await recargar()
    setOperando(false)
    await registrarAccion(
      'Operador',
      'toggle_ensayo',
      nuevo ? 'Modo ensayo activado' : 'Modo ensayo desactivado',
    )
  }

  const handleGenerarActa = async () => {
    if (!evento) return
    setOperando(true)
    setError(null)
    try {
      await generarActaOficial({
        eventoNombre: evento.nombre,
        etapa,
        fecha: new Date(),
        candidatas,
        jurados,
        criterios,
        evaluaciones,
        detalles,
      })
      await registrarAccion('Operador', 'generar_acta', `Acta: ${evento.nombre} — ${etapa}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
    setOperando(false)
  }

  const botones: BotonConsola[] = [
    {
      estado: 'evaluando',
      etiqueta: 'Iniciar Evaluación',
      detalle: 'Habilita la puntuación de los jurados',
      deshabilitado: estadoActual === 'evaluando' || !completo || operando,
      accion: () => void cambiarEstado('evaluando', false),
    },
    {
      estado: 'resultados_listos',
      etiqueta: 'Cerrar Evaluación',
      detalle: respondieronTodos
        ? 'Todos los jurados completaron sus evaluaciones — cierra y deja listo el cómputo'
        : `Esperando ${jurados.length - respondidos} jurado${jurados.length - respondidos === 1 ? '' : 's'} por terminar (${respondidos}/${jurados.length})`,
      deshabilitado: estadoActual !== 'evaluando' || !respondieronTodos || operando,
      accion: () => void cambiarEstado('resultados_listos', false),
    },
    {
      estado: 'publicado',
      etiqueta: 'Publicar Resultados',
      detalle: 'Difunde el resultado en la pantalla pública',
      deshabilitado:
        (estadoActual !== 'evaluando' && estadoActual !== 'resultados_listos') || operando,
      accion: () => void cambiarEstado('publicado', false),
    },
  ]

  const stateColors = EVENT_STATE_COLORS[estadoActual]
  const estadoLabel = EVENT_STATE_LABELS[estadoActual] ?? estadoActual

  const handleExportarExcel = async () => {
    if (!evento) return
    setExportando(true)
    setError(null)
    try {
      exportarResultadosExcel({
        eventoNombre: evento.nombre,
        etapa,
        candidatas,
        jurados,
        criterios,
        evaluaciones,
        detalles,
      })
      await registrarAccion('Operador', 'exportar_excel', `Resultados exportados (${evento.nombre} — ${etapa})`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
    setExportando(false)
  }

  const handleDescargarRespaldo = async () => {
    try {
      await descargarRespaldoJSON()
      await registrarAccion('Operador', 'descargar_respaldo', 'Respaldo JSON descargado')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const reiniciarCertamen = async () => {
    setReiniciando(true)
    setError(null)
    setResetAbierto(false)
    try {
      await resetCertamen()
      await recargar()
      await registrarAccion('Operador', 'reiniciar_certamen', 'Certamen reiniciado (todos los datos eliminados)')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
    setReiniciando(false)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PanelHeader
        eyebrow="Centro de Control"
        title="Consola de Operación"
        description="Conduce el certamen en vivo: cambia de estado, conduce la candidata en pantalla y cierra o publica resultados sin abrir la base de datos."
      />

      {error && (
        <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
      )}

      {cargandoInicial ? (
        <>
          <SectionSkeleton rows={5} lista={false} />
          <SectionSkeleton rows={4} />
          <SectionSkeleton rows={4} />
        </>
      ) : (
        <>
      {/* Tarjeta principal: consola */}
      <section className="panel-card overflow-hidden p-6 sm:p-8">
        {/* Zona 1: estado en vivo */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold-300/90">
              Certamen en vivo
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white">{evento?.nombre ?? 'Sin certamen registrado'}</h2>
            <p className="mt-1 text-sm text-navy-300">
              Etapa: <span className="font-semibold text-gold-300">{etapa || '—'}</span>
            </p>
          </div>
          <div className="flex flex-col items-start justify-center gap-4 sm:flex-row sm:items-center sm:justify-end">
            <div className="text-left sm:text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-navy-400">
                Hora local
              </p>
              <p className="font-mono text-3xl font-bold tabular-nums leading-none text-white">
                {hora}
              </p>
              <p className="mt-1.5 text-xs capitalize text-navy-400">{fecha}</p>
            </div>
            <span
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 ${stateColors.bg} ${stateColors.text} ${stateColors.ring}`}
            >
              <span className={`h-2 w-2 rounded-full bg-current ${estadoActual === 'evaluando' ? 'animate-pulse' : ''}`} />
              {estadoLabel}
            </span>
          </div>
        </div>

        {/* Zona 2: controles */}
        <div className="mt-7 border-t border-white/10 pt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-navy-300">
            Controles del certamen
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {botones.map((b) => {
              const activo = estadoActual === b.estado
              const est = estiloBoton[b.estado]
              return (
                <button
                  key={b.estado}
                  onClick={b.accion}
                  disabled={b.deshabilitado}
                  className={`relative flex w-full flex-col items-start gap-1 rounded-2xl border px-4 py-4 text-left transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-35 disabled:saturate-50 ${
                    activo ? est.activo : est.neutral
                  }`}
                >
                  <span className="flex w-full items-center justify-between gap-2 text-sm font-bold uppercase tracking-wide">
                    <span className="truncate">{b.etiqueta}</span>
                    {activo && <span className={`h-2 w-2 shrink-0 rounded-full ${est.dot} animate-pulse`} />}
                  </span>
                  <span className="text-xs font-medium opacity-75">{b.detalle}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Zona 2b: progreso real de jurados */}
        <div className="mt-7 border-t border-white/10 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-navy-300">
              Progreso de jurados
            </p>
            <p className="text-xs font-bold tabular-nums text-gold-300">
              {respondidos} / {jurados.length} jurados completos
            </p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-navy-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                respondieronTodos ? 'bg-emerald-500' : 'bg-gold-500'
              }`}
              style={{ width: `${pctRespondidos}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {jurados.length === 0 ? (
              <p className="text-xs text-navy-400/80">Registra jurados antes de iniciar.</p>
            ) : (
              progresoJurados.map((p) => (
                <span key={p.jurado.id} className={`chip ${p.listo ? 'chip-ok' : 'chip-muted'}`}>
                  <span className="font-mono">{p.jurado.codigo}</span>{' '}
                  <span className="tabular-nums">
                    {Math.min(p.completadas, totalCandidatas)}/{totalCandidatas}
                  </span>{' '}
                  {p.listo ? '✓' : '⏳'}
                </span>
              ))
            )}
          </div>
          {estadoActual === 'evaluando' && !respondieronTodos && (
            <p className="mt-3 text-[11px] text-navy-400">
              “Cerrar Evaluación” se habilitará cuando todos los jurados completen sus{' '}
              {totalCandidatas}/{totalCandidatas} evaluaciones.
            </p>
          )}
        </div>

        {/* Zona 3: candidata actual + navegación rápida */}
        <div className="mt-7 border-t border-white/10 pt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-navy-300">
            Candidata en pantalla
          </p>
          <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gold-500/20 text-lg font-bold text-gold-300 ring-1 ring-gold-500/40">
                {candidataActual ? iniciales(candidataActual.nombre) : '—'}
              </span>
              <div className="min-w-0">
                <p className="text-lg font-bold text-white">{candidataActual?.nombre ?? 'Sin candidata activa'}</p>
                <p className="text-xs text-navy-400">
                  {candidataActual
                    ? `${candidataActual.grado} · Sección ${candidataActual.seccion}`
                    : 'Usa Anterior / Siguiente o agrega una candidata'}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-gold-300">
                  {posicion !== null ? `Candidata ${posicion} de ${candidatas.length}` : `${candidatas.length} candidatas registradas`}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link to="/panel/candidatas" className="btn-ghost shrink-0">
                + Agregar candidata
              </Link>
              <button
                onClick={() => setQrAbierto(true)}
                className="btn-gold shrink-0"
              >
                Mostrar QR de ingreso
              </button>
              <button
                onClick={() => void navegarCandidata(-1)}
                disabled={!candidataActual || idx < 1 || operando}
                className="btn-ghost shrink-0 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Anterior
              </button>
              <button
                onClick={() => void navegarCandidata(1)}
                disabled={!candidataActual || idx < 0 || idx >= candidatas.length - 1 || operando}
                className="btn-ghost shrink-0 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente →
              </button>
            </div>
          </div>
        </div>

        {/* Zona 4: herramientas (modo ensayo + reportes) — la pantalla pública es automática */}
        <div className="mt-7 border-t border-white/10 pt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-navy-300">
            Herramientas
          </p>
          <p className="mt-1 text-xs text-navy-400">
            La pantalla pública cambia sola según el estado del certamen (inicio → candidata →
            esperando → resultados). No requiere botones.
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => void toggleModoEnsayo()}
              disabled={!estadoEvento || operando}
              className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition-all duration-200 disabled:opacity-50 ${
                estadoEvento?.modo_ensayo
                  ? 'border-amber-400/70 bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/40'
                  : 'border-white/10 bg-navy-800/40 text-navy-200 hover:text-white'
              }`}
            >
              {estadoEvento?.modo_ensayo ? '◉ Modo Ensayo ACTIVO' : '○ Modo Ensayo'}
            </button>
            <button
              onClick={() => void handleExportarExcel()}
              disabled={!evento || operando || exportando}
              className="btn-ghost"
            >
              {exportando ? 'Exportando…' : 'Exportar a Excel'}
            </button>
            <button
              onClick={() => void handleGenerarActa()}
              disabled={!evento || operando}
              className="btn-gold"
            >
              Generar Acta Oficial
            </button>
          </div>
          {estadoEvento?.modo_ensayo && (
            <p className="mt-3 text-[11px] text-amber-300/80">
              Las evaluaciones realizadas en modo ensayo quedan marcadas como simuladas y no afectan los resultados oficiales ni el ranking.
            </p>
          )}
        </div>
      </section>

      {/* Checklist + reiniciar */}
      <Section
        titulo="Checklist de configuración"
        descripcion="Requisitos previos para iniciar la evaluación"
        completado={completo}
      >
        <div className="flex items-start justify-between gap-4">
          <ul className="grid flex-1 gap-2 sm:grid-cols-2">
            {checklist.map((item) => (
              <li
                key={item.clave}
                className={`fila-panel text-sm font-medium ${
                  item.ok ? 'text-emerald-200' : 'text-navy-300'
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
                <span className={`ml-auto text-[10px] uppercase ${item.ok ? 'text-emerald-400' : 'text-navy-500'}`}>
                  {item.ok ? 'Listo' : 'Pendiente'}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <button
              onClick={() => void handleDescargarRespaldo()}
              disabled={operando}
              className="btn-ghost shrink-0"
            >
              Descargar Respaldo
            </button>
            <button
              onClick={() => setResetAbierto(true)}
              disabled={reiniciando || operando}
              className="btn-danger shrink-0"
            >
              {reiniciando ? 'Reiniciando…' : 'Reiniciar Certamen'}
            </button>
          </div>
        </div>

        <div className="mt-6 border-t border-white/10 pt-5">
          {estadoActual === 'evaluando' ? (
            <p className="text-center text-sm font-semibold text-emerald-300">
              ✓ Evaluación activa — los jurados ya pueden puntuar a la candidata en pantalla.
            </p>
          ) : estadoActual === 'publicado' ? (
            <p className="text-center text-sm font-semibold text-purple-300">
              ✓ Resultados publicados — el certamen concluyó para la audiencia.
            </p>
          ) : (
            <p className="text-center text-xs text-navy-300/70">
              {completo
                ? 'Todo listo para iniciar la evaluación desde la consola.'
                : 'Completa todos los pasos para habilitar el inicio.'}
            </p>
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
          <p className="text-sm text-navy-400/80">Sin jurados registrados todavía.</p>
        ) : (
          <ul className="space-y-2">
            {jurados.map((j) => (
              <li key={j.id} className="fila-panel text-sm">
                <span className="font-mono text-xs font-bold text-gold-300">{j.codigo}</span>
                <span className="flex-1 truncate text-left text-white">{j.nombre}</span>
                <div className="flex shrink-0 items-center gap-2">
                  {j.en_sesion && <span className="chip chip-ok">● En sesión</span>}
                  <span className={`chip ${j.activado ? 'chip-ok' : 'chip-muted'}`}>
                    {j.activado ? '✔ Activado' : 'Pendiente'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
        </>
      )}

      <QRIngresoModal
        evento={evento?.nombre}
        abierto={qrAbierto}
        onCerrar={() => setQrAbierto(false)}
      />

      <ReiniciarCertamenModal
        abierto={resetAbierto}
        onCerrar={() => setResetAbierto(false)}
        onConfirmar={reiniciarCertamen}
      />
    </div>
  )
}