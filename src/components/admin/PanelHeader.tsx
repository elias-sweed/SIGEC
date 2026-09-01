interface PanelHeaderProps {
  eyebrow: string
  title: string
  description: string
}

export default function PanelHeader({ eyebrow, title, description }: PanelHeaderProps) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">{eyebrow}</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-navy-300">{description}</p>
      <div className="mt-4 h-1 w-14 rounded-full bg-gold-500/70" />
    </div>
  )
}