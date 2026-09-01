interface ScoreSliderProps {
  index: number
  label: string
  value: number
  max: number
  descripcion?: string
  onChange: (value: number) => void
}

export default function ScoreSlider({ index, label, value, max, descripcion, onChange }: ScoreSliderProps) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const ajustar = (delta: number) => {
    const siguiente = Math.min(max, Math.max(0, value + delta))
    onChange(Number(siguiente.toFixed(1)))
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-white/10 bg-navy-800/60 p-3 transition-colors hover:border-gold-500/25">
      {/* Encabezado: badge numerado + nombre + máximo */}
      <div className="flex items-start gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-500/20 text-xs font-bold text-gold-400">
          {index}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight text-white">{label}</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-navy-500">
            Hasta {max} pts
          </p>
        </div>
      </div>

      {/* Indicador */}
      {descripcion && (
        <p className="line-clamp-2 text-[11px] leading-snug text-navy-400">{descripcion}</p>
      )}

      {/* Valor + controles */}
      <div className="mt-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => ajustar(-0.5)}
          disabled={value <= 0}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-navy-700/40 text-lg font-bold text-navy-200 transition hover:border-gold-500/40 hover:text-gold-400 active:scale-95 disabled:opacity-30"
          aria-label="Restar 0.5"
        >
          −
        </button>

        <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <span className="text-3xl font-bold leading-none tabular-nums text-gold-400">{value}</span>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-navy-700">
            <div
              className="h-full rounded-full bg-gold-500 transition-all duration-200"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => ajustar(0.5)}
          disabled={value >= max}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-navy-700/40 text-lg font-bold text-navy-200 transition hover:border-gold-500/40 hover:text-gold-400 active:scale-95 disabled:opacity-30"
          aria-label="Sumar 0.5"
        >
          +
        </button>
      </div>
    </div>
  )
}