interface JuradoInfo {
  id: string
  nombre: string
  respondio: boolean
}

interface JuryProgressCardProps {
  total: number
  completados: number
  jurados: JuradoInfo[]
}

export default function JuryProgressCard({ total, completados, jurados }: JuryProgressCardProps) {
  const porcentaje = total > 0 ? Math.round((completados / total) * 100) : 0

  return (
    <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-6 transition-all duration-300">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">Jurados</p>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-white">{completados}</span>
        <span className="text-lg text-navy-300">/ {total} respondieron</span>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-navy-700">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${porcentaje}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-1.5">
        {jurados.map((j) => (
          <div
            key={j.id}
            className="flex items-center justify-between rounded-lg px-3 py-1.5 text-sm"
          >
            <span className="truncate text-navy-200">{j.nombre}</span>
            <span className={`shrink-0 font-semibold ${j.respondio ? 'text-emerald-400' : 'text-navy-500'}`}>
              {j.respondio ? 'Completado' : 'Pendiente'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
