interface PanelHeaderProps {
  eyebrow: string
  title: string
  description: string
}

export default function PanelHeader({ eyebrow, title, description }: PanelHeaderProps) {
  return (
    <div className="mb-8">
      <div className="panel-overline text-[11px] font-semibold uppercase tracking-[0.3em] text-gold-300/90">
        {eyebrow}
      </div>
      <h1 className="mt-2.5 bg-gradient-to-br from-white via-gold-100 to-gold-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
        {title}
      </h1>
      <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-navy-200/90">{description}</p>
    </div>
  )
}