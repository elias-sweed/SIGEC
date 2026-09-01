interface SectionProps {
  titulo: string
  descripcion: string
  completado: boolean
  children: React.ReactNode
}

export default function Section({ titulo, descripcion, completado, children }: SectionProps) {
  return (
    <section className="panel-card p-6">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-white">{titulo}</h3>
          <p className="mt-0.5 truncate text-xs text-navy-300/80">{descripcion}</p>
        </div>
        <span
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${
            completado
              ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25'
              : 'bg-navy-700/40 text-navy-300 ring-1 ring-white/10'
          }`}
        >
          {completado ? '✔ Listo' : 'Pendiente'}
        </span>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}