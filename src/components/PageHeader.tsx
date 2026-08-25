interface PageHeaderProps {
  eyebrow: string
  title: string
  description: string
}

export default function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <section className="mx-auto max-w-3xl text-center">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-gold-400">
        {eyebrow}
      </p>
      <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">{title}</h1>
      <p className="mt-4 text-base leading-relaxed text-navy-200 sm:text-lg">{description}</p>
      <div className="mx-auto mt-6 h-1 w-16 rounded-full bg-gold-500" />
    </section>
  )
}
