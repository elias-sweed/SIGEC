import { lazy, Suspense, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { cerrarSesionSuperadmin } from '../lib/adminAuth'
import { PanelDataProvider, usePanelData } from '../context/PanelDataContext'
import logo from '../assets/Logo/logo.png'

const Beams = lazy(() => import('../components/effects/Beams'))

interface SeccionItem {
  ruta: string
  etiqueta: string
  end?: boolean
  icono: React.ReactNode
}

function AdminLayoutContent() {
  const navigate = useNavigate()
  const { evento, candidatas, jurados, criterios } = usePanelData()

  const [mobileAbierto, setMobileAbierto] = useState(false)
  const [colapsado, setColapsado] = useState(false)

  const cerrar = async () => {
    await cerrarSesionSuperadmin()
    navigate('/')
  }

  const secciones: SeccionItem[] = [
    {
      ruta: '/panel',
      etiqueta: 'Resumen',
      end: true,
      icono: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
        </svg>
      ),
    },
    {
      ruta: '/panel/evento',
      etiqueta: 'Evento',
      icono: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      ),
    },
    {
      ruta: '/panel/candidatas',
      etiqueta: 'Candidatas',
      icono: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      ),
    },
    {
      ruta: '/panel/jurados',
      etiqueta: 'Jurados',
      icono: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      ruta: '/panel/criterios',
      etiqueta: 'Criterios',
      icono: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
        </svg>
      ),
    },
    {
      ruta: '/panel/conectados',
      etiqueta: 'Conectados',
      icono: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      ),
    },
    {
      ruta: '/panel/accesos',
      etiqueta: 'Accesos (QR)',
      icono: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
        </svg>
      ),
    },
    {
      ruta: '/panel/evaluaciones',
      etiqueta: 'Evaluaciones',
      icono: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      ),
    },
  ]

  const totalActivados = jurados.filter((j) => j.activado).length

  const enlaceClase = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ${
      colapsado ? 'justify-center px-0' : ''
    } ${
      isActive
        ? 'bg-gradient-to-r from-gold-500/25 via-gold-500/10 to-transparent text-gold-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-gold-500/40'
        : 'text-navy-200 hover:bg-white/5 hover:text-white'
    }`

  const linkInterior = (s: { ruta: string; etiqueta: string; icono: ReactNode; end?: boolean }, isActive: boolean) => (
    <>
      {!colapsado && (
        <span
          aria-hidden
          className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-gold-300 to-gold-500 transition-opacity duration-200 ${
            isActive ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
      <span className="shrink-0">{s.icono}</span>
      {!colapsado && <span className="truncate">{s.etiqueta}</span>}
    </>
  )

  const contenidoSidebar = (
    <div className="flex h-full flex-col">
      <div
        className={`flex items-center gap-3 py-5 ${
          colapsado ? 'flex-col px-0' : 'px-2'
        }`}
      >
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-b from-navy-700 to-navy-900 shadow-[0_0_18px_rgba(201,162,39,0.35)] ring-1 ring-gold-500/50">
          <img src={logo} alt="Logo del certamen" className="h-9 w-9 object-contain" />
        </span>
        {!colapsado && (
          <div className="min-w-0 leading-tight">
            <span className="block truncate bg-gradient-to-r from-gold-200 via-gold-300 to-gold-500 bg-clip-text text-sm font-bold tracking-wide text-transparent">
              ECSA 2026
            </span>
            <span className="block truncate text-[11px] text-navy-400">Centro de Control</span>
          </div>
        )}
      </div>

      {!colapsado && (
        <p className="mx-2 mb-3 truncate rounded-lg border border-gold-500/20 bg-gold-500/5 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-gold-300/80">
          {evento?.nombre ?? 'Sin certamen'}
        </p>
      )}

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2">
        {secciones.map((s) => (
          <NavLink
            key={s.ruta}
            to={s.ruta}
            end={s.end}
            className={enlaceClase}
            onClick={() => setMobileAbierto(false)}
            title={colapsado ? s.etiqueta : undefined}
          >
            {({ isActive }) => linkInterior(s, isActive)}
          </NavLink>
        ))}
      </nav>

      <div className={`space-y-3 border-t border-white/10 py-4 ${colapsado ? 'px-0' : 'px-2'}`}>
        {!colapsado && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-white/10 bg-gradient-to-b from-navy-800/80 to-navy-900/40 px-1 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <p className="text-lg font-bold leading-none text-gold-300">{candidatas.length}</p>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-navy-400">Candidatas</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-gradient-to-b from-navy-800/80 to-navy-900/40 px-1 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <p className="text-lg font-bold leading-none text-emerald-300">{totalActivados}</p>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-navy-400">Activados</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-gradient-to-b from-navy-800/80 to-navy-900/40 px-1 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <p className="text-lg font-bold leading-none text-white">{criterios.length}</p>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-navy-400">Criterios</p>
            </div>
          </div>
        )}

        <button
          onClick={cerrar}
          title={colapsado ? 'Cerrar sesión' : undefined}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm font-medium text-navy-200 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m-3 3l-3-3m3 3h-9" />
          </svg>
          {!colapsado && <span className="shrink-0">Cerrar sesión</span>}
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-navy-950 text-white">
      {/* Sidebar escritorio (estático) */}
      <aside
        className={`relative hidden shrink-0 border-r border-white/10 bg-gradient-to-b from-navy-900 to-navy-950 backdrop-blur transition-all duration-300 lg:block ${
          colapsado ? 'w-16' : 'w-64'
        }`}
      >
        {contenidoSidebar}
      </aside>

      {/* Sidebar móvil (overlay) */}
      {mobileAbierto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileAbierto(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 border-r border-white/10 bg-gradient-to-b from-navy-900 to-navy-950">
            {contenidoSidebar}
          </aside>
        </div>
      )}

      {/* Columna principal con scroll propio */}
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Fondo de beams para el contenido del panel */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0 bg-navy-950">
          <Suspense fallback={null}>
            <Beams
              beamWidth={3}
              beamHeight={30}
              beamNumber={20}
              lightColor="#ffffff"
              speed={2}
              noiseIntensity={1.75}
              scale={0.2}
              rotation={30}
              beamColor="#000000"
              backgroundColor="#06070f"
            />
          </Suspense>
        </div>

        <header className="relative z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-navy-950/80 px-4 py-3 backdrop-blur">
          <span
            aria-hidden
            className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-gold-500/50 to-transparent"
          />
          <span className="hidden truncate text-sm font-semibold text-white sm:block">
            {evento?.nombre ?? 'Centro de Control'}
          </span>
          <span className="truncate text-sm font-semibold text-white sm:hidden">
            Centro de Control
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setColapsado((v) => !v)}
              className="hidden h-9 w-9 place-items-center rounded-lg border border-white/10 text-navy-200 transition hover:bg-white/5 lg:grid"
              title={colapsado ? 'Mostrar sidebar' : 'Ocultar sidebar'}
              aria-label={colapsado ? 'Mostrar sidebar' : 'Ocultar sidebar'}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                className={`h-5 w-5 transition-transform duration-300 ${colapsado ? 'rotate-180' : ''}`}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
              </svg>
            </button>
            <button
              onClick={() => setMobileAbierto(true)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-navy-200 hover:bg-white/5 lg:hidden"
              aria-label="Abrir menú"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
              </svg>
            </button>
          </div>
        </header>

        <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-5 py-8 sm:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default function AdminLayout() {
  return (
    <PanelDataProvider>
      <AdminLayoutContent />
    </PanelDataProvider>
  )
}