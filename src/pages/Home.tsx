import { Link } from 'react-router-dom'

const accesses = [
  {
    to: '/jurado',
    title: 'Panel del Jurado',
    description:
      'Espacio del cuerpo de jurados para registrar puntajes y comentarios de cada presentación.',
  },
  {
    to: '/maestro',
    title: 'Panel Maestro',
    description:
      'Centro de control del certamen: participantes, categorías y configuración general.',
  },
  {
    to: '/publico',
    title: 'Pantalla Pública',
    description: 'Proyección en vivo con la información y resultados para la audiencia del evento.',
  },
]

export default function Home() {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[-6rem] mx-auto h-[420px] max-w-4xl bg-[radial-gradient(closest-side,rgba(201,162,39,0.16),transparent)]"
      />

      <section className="relative mx-auto max-w-3xl text-center">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-gold-400">
          Certamen de Danza
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
          Bienvenido a <span className="text-gold-400">SIGEC</span>
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-navy-200">
          Sistema Integral de Gestión y Evaluación del Certamen. Centraliza la organización
          del evento, la evaluación del jurado y la difusión de resultados en una sola plataforma.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/jurado" className="btn-primary">
            Ir al Panel del Jurado
          </Link>
          <Link to="/maestro" className="btn-outline">
            Abrir Panel Maestro
          </Link>
          <Link to="/publico" className="btn-outline">
            Ver Pantalla Pública
          </Link>
        </div>
      </section>

      <section className="relative mt-16 grid gap-6 md:grid-cols-3">
        {accesses.map((access, index) => (
          <Link key={access.to} to={access.to} className="card-panel group">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gold-500/15 font-semibold text-gold-400 transition-colors group-hover:bg-gold-500 group-hover:text-navy-950">
              {String(index + 1).padStart(2, '0')}
            </span>
            <h2 className="mt-4 text-lg font-semibold text-white">{access.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-navy-200">{access.description}</p>
            <span className="mt-4 inline-block text-sm font-semibold text-gold-400 transition-colors group-hover:text-gold-300">
              Acceder →
            </span>
          </Link>
        ))}
      </section>
    </div>
  )
}
