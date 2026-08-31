import { Link } from 'react-router-dom'

const accesos = [
  {
    to: '/panel',
    titulo: 'Centro de Control',
    descripcion: 'Prepara el certamen, gestiona jurados y candidatas, e inicia la evaluación.',
    icono: '⚙',
    etiqueta: 'Administrar',
  },
  {
    to: '/pantalla',
    titulo: 'Pantalla Pública',
    descripcion: 'Proyección del certamen para la audiencia.',
    icono: '📺',
    etiqueta: 'Ver',
  },
]

export default function Home() {
  return (
    <div className="space-y-10 text-center">
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-[-6rem] mx-auto h-[400px] max-w-4xl bg-[radial-gradient(closest-side,rgba(201,162,39,0.16),transparent)]"
        />
        <p className="relative mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-gold-400">
          Certamen de Danza
        </p>
        <h1 className="relative text-4xl font-bold tracking-tight text-white sm:text-6xl">
          Bienvenido a <span className="text-gold-400">SIGEC</span>
        </h1>
        <p className="relative mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-navy-200">
          Sistema Integral de Gestión y Evaluación del Certamen. Centraliza la organización, la
          evaluación del jurado y la difusión de resultados en una sola plataforma.
        </p>
      </div>

      <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
        {accesos.map((tarjeta) => (
          <Link
            key={tarjeta.to}
            to={tarjeta.to}
            className="group block rounded-xl border border-white/10 bg-navy-900/70 p-8 transition-colors hover:border-gold-500/50"
          >
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gold-500/15 text-xl text-gold-400 transition-colors group-hover:bg-gold-500 group-hover:text-navy-950">
              {tarjeta.icono}
            </span>
            <h2 className="mt-4 text-xl font-semibold text-white">{tarjeta.titulo}</h2>
            <p className="mt-2 text-sm leading-relaxed text-navy-200">{tarjeta.descripcion}</p>
            <span className="mt-5 inline-block text-sm font-semibold text-gold-400 transition-colors group-hover:text-gold-300">
              {tarjeta.etiqueta} →
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}