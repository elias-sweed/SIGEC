interface ScoreSliderProps {
  index: number
  label: string
  value: number
  max: number
  descripcion?: string
  desempate?: boolean
  bloqueado?: boolean
  onChange: (value: number) => void
}

export default function ScoreSlider({
  index,
  label,
  value,
  max,
  descripcion,
  desempate = false,
  bloqueado = false,
  onChange,
}: ScoreSliderProps) {
  const base = desempate
    ? 'border-gold-500/30 bg-gold-500/[0.05] hover:border-gold-500/50'
    : 'border-white/10 bg-navy-800/60 hover:border-gold-500/25'
  return (
    <div
      className={`flex flex-col gap-2.5 rounded-xl border p-3 transition-colors ${base} ${
        bloqueado ? 'cursor-not-allowed opacity-60' : ''
      }`}
    >
      {/* Encabezado: badge numerado + nombre + máximo */}
      <div className="flex items-start gap-2">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            bloqueado
              ? 'bg-emerald-500/25 text-emerald-300'
              : desempate
                ? 'bg-gold-500/25 text-gold-300'
                : 'bg-gold-500/20 text-gold-400'
          }`}
        >
          {index}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-sm font-semibold leading-tight text-white">{label}</p>
            {bloqueado && (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400 ring-1 ring-emerald-500/30">
                ✓ Evaluado
              </span>
            )}
            {!bloqueado && desempate && (
              <span className="rounded-full bg-gold-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold-300 shadow-[inset_0_0_0_1px_rgba(223,191,98,0.3)]">
                Desempate
              </span>
            )}
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-navy-500">
            Hasta {max} pts
          </p>
        </div>
      </div>

      {/* Indicador */}
      {descripcion && (
        <p className="line-clamp-2 text-[11px] leading-snug text-navy-400">{descripcion}</p>
      )}

      {/* Valor + control deslizante (tipo volumen) */}
      <div className="mt-auto flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span
            className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
              desempate ? 'text-gold-500' : 'text-navy-500'
            }`}
          >
            Puntaje
          </span>
          <span
            className={`text-3xl font-bold leading-none tabular-nums ${
              bloqueado ? 'text-emerald-400' : 'text-gold-400'
            }`}
          >
            {Number.isInteger(value) ? value : value.toFixed(1)}
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={max}
          step={0.5}
          value={value}
          disabled={bloqueado}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={`Puntaje de ${label}`}
          className="w-full accent-gold-500 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ height: '24px' }}
        />

        <div className="flex justify-between text-[10px] font-semibold tabular-nums text-navy-500">
          <span>0</span>
          <span>Hasta {max} pts</span>
        </div>
      </div>
    </div>
  )
}