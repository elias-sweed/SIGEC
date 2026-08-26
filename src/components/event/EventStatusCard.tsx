import type { EventState } from '../../constants/eventStates'
import { EVENT_STATE_LABELS, EVENT_STATE_COLORS } from '../../constants/eventStates'

interface EventStatusCardProps {
  nombre: string
  etapa: string
  estado: EventState
  children?: React.ReactNode
}

export default function EventStatusCard({ nombre, etapa, estado, children }: EventStatusCardProps) {
  const colors = EVENT_STATE_COLORS[estado]

  return (
    <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-6 transition-all duration-300">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">Evento</p>
      <h3 className="mt-2 text-xl font-bold text-white">{nombre}</h3>
      <div className="mt-3 flex items-center gap-2">
        <span className="rounded-full bg-navy-700 px-3 py-1 text-xs font-semibold text-navy-200">
          {etapa}
        </span>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${colors.bg} ${colors.text} ${colors.ring}`}>
          {EVENT_STATE_LABELS[estado]}
        </span>
      </div>
      {children && <div className="mt-4 flex flex-wrap gap-2">{children}</div>}
    </div>
  )
}
