export const EVENT_STATES = [
  'preparando',
  'evaluando',
  'esperando_jurados',
  'resultados_listos',
  'publicado',
] as const

export type EventState = (typeof EVENT_STATES)[number]

export const EVENT_STATE_LABELS: Record<EventState, string> = {
  preparando: 'Preparando',
  evaluando: 'Evaluando',
  esperando_jurados: 'Esperando Jurados',
  resultados_listos: 'Resultados Listos',
  publicado: 'Publicado',
}

export const EVENT_STATE_COLORS: Record<EventState, { bg: string; text: string; ring: string }> = {
  preparando:          { bg: 'bg-slate-500/15',  text: 'text-slate-300',    ring: 'ring-slate-500/30' },
  evaluando:           { bg: 'bg-emerald-500/15', text: 'text-emerald-400', ring: 'ring-emerald-500/30' },
  esperando_jurados:   { bg: 'bg-amber-500/15',   text: 'text-amber-400',   ring: 'ring-amber-500/30' },
  resultados_listos:   { bg: 'bg-blue-500/15',    text: 'text-blue-400',    ring: 'ring-blue-500/30' },
  publicado:           { bg: 'bg-purple-500/15',  text: 'text-purple-400',  ring: 'ring-purple-500/30' },
}
