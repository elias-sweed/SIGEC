interface SectionProps {
  titulo: string
  descripcion: string
  completado: boolean
  children: React.ReactNode
}

export default function Section({ titulo, descripcion, completado, children }: SectionProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-navy-900/70 p-6">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-white">{titulo}</h3>
          <p className="truncate text-xs text-navy-400">{descripcion}</p>
        </div>
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
            completado ? 'bg-emerald-500/15 text-emerald-400' : 'border border-navy-600 text-transparent'
          }`}
        >
          ✔
        </span>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}