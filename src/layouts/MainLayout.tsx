import { NavLink, Outlet } from 'react-router-dom'

const navigation = [
  { label: 'Inicio', to: '/' },
  { label: 'Panel del Jurado', to: '/jurado' },
  { label: 'Panel Maestro', to: '/maestro' },
  { label: 'Pantalla Pública', to: '/publico' },
]

export default function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-navy-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-4">
          <NavLink to="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-500 text-lg font-bold text-navy-950">
              S
            </span>
            <span className="leading-tight">
              <span className="block text-lg font-semibold tracking-wide text-white">SIGEC</span>
              <span className="block text-xs text-navy-300">Gestión y Evaluación del Certamen</span>
            </span>
          </NavLink>

          <nav className="flex flex-wrap items-center gap-1.5">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-gold-500 text-navy-950'
                      : 'text-navy-100 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
        <Outlet />
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-5 text-sm text-navy-300">
          <p>© 2026 SIGEC · Certamen de Danza</p>
          <p>Fase 01 — Base del proyecto</p>
        </div>
      </footer>
    </div>
  )
}
