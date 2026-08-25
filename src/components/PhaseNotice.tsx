import type { ReactNode } from 'react'

interface PhaseNoticeProps {
  children: ReactNode
}

export default function PhaseNotice({ children }: PhaseNoticeProps) {
  return (
    <section className="mx-auto mt-12 max-w-xl rounded-xl border border-dashed border-gold-500/40 bg-navy-900/50 px-6 py-5 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">
        Próxima fase
      </p>
      <p className="mt-2 text-sm leading-relaxed text-navy-200">{children}</p>
    </section>
  )
}
