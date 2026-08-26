interface CandidateCardProps {
  nombre: string
  grado: string
  seccion: string
  onPrevious?: () => void
  onNext?: () => void
  disabled?: boolean
}

export default function CandidateCard({
  nombre,
  grado,
  seccion,
  onPrevious,
  onNext,
  disabled,
}: CandidateCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-6 transition-all duration-300">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
        Candidata Activa
      </p>
      <div className="mt-3 flex items-center gap-4">
        <button
          onClick={onPrevious}
          disabled={disabled}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-navy-800 text-lg text-white transition hover:bg-navy-700 disabled:opacity-30"
        >
          ←
        </button>
        <div className="min-w-0 flex-1 text-center">
          <h3 className="truncate text-2xl font-bold text-white">{nombre}</h3>
          <p className="mt-1 text-sm text-navy-300">
            {grado} · Sección {seccion}
          </p>
        </div>
        <button
          onClick={onNext}
          disabled={disabled}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-navy-800 text-lg text-white transition hover:bg-navy-700 disabled:opacity-30"
        >
          →
        </button>
      </div>
    </div>
  )
}
