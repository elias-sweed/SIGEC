interface ScoreSliderProps {
  label: string
  value: number
  max: number
  descripcion?: string
  onChange: (value: number) => void
}

export default function ScoreSlider({ label, value, max, descripcion, onChange }: ScoreSliderProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-navy-800/50 px-4 py-3 transition-colors hover:border-gold-500/20">
      <div className="flex items-center justify-between">
        <span className="font-medium text-white">{label}</span>
        <span className="tabular-nums text-sm text-navy-300">
          <span className="font-semibold text-gold-400">{value}</span> / {max}
        </span>
      </div>
      {descripcion && (
        <p className="mt-0.5 text-xs leading-relaxed text-navy-400">{descripcion}</p>
      )}
      <input
        type="range"
        min={0}
        max={max}
        step={0.5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-navy-700 accent-gold-500"
      />
    </div>
  )
}