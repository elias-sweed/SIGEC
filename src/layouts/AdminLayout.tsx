import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { cerrarSesionSuperadmin } from '../lib/adminAuth'
import { PanelDataProvider, usePanelData } from '../context/PanelDataContext'
import logo from '../assets/Logo/logo.png'

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
    `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
      colapsado ? 'justify-center px-0' : ''
    } ${
      isActive ? 'bg-gold-500 text-navy-950' : 'text-navy-200 hover:bg-white/5 hover:text-white'
    }`

  const contenidoSidebar = (
    <div className="flex h-full flex-col">
      <div
        className={`flex items-center gap-3 py-5 ${
          colapsado ? 'flex-col px-0' : 'px-2'
        }`}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-navy-800/60 ring-1 ring-white/10">
          <img src={logo} alt="Logo del certamen" className="h-9 w-9 object-contain" />
        </span>
        {!colapsado && (
          <div className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-semibold tracking-wide text-white">
              ECSA 2026
            </span>
            <span className="block truncate text-[11px] text-navy-400">Centro de Control</span>
          </div>
        )}
      </div>

      {!colapsado && (
        <p className="truncate px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-navy-500">
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
            <span className="shrink-0">{s.icono}</span>
            {!colapsado && <span className="truncate">{s.etiqueta}</span>}
          </NavLink>
        ))}
      </nav>

      <div className={`space-y-3 border-t border-white/10 py-4 ${colapsado ? 'px-0' : 'px-2'}`}>
        {!colapsado && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-navy-800/60 px-1 py-2">
              <p className="text-lg font-bold leading-none text-gold-400">{candidatas.length}</p>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-navy-400">Candidatas</p>
            </div>
            <div className="rounded-lg bg-navy-800/60 px-1 py-2">
              <p className="text-lg font-bold leading-none text-emerald-400">{totalActivados}</p>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-navy-400">Activados</p>
            </div>
            <div className="rounded-lg bg-navy-800/60 px-1 py-2">
              <p className="text-lg font-bold leading-none text-white">{criterios.length}</p>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-navy-400">Criterios</p>
            </div>
          </div>
        )}

        <button
          onClick={cerrar}
          title={colapsado ? 'Cerrar sesión' : undefined}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-3.5 py-2.5 text-sm font-medium text-navy-200 transition hover:bg-red-500/10 hover:text-red-400"
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
        className={`hidden shrink-0 border-r border-white/10 bg-navy-900 transition-all duration-300 lg:block ${
          colapsado ? 'w-16' : 'w-64'
        }`}
      >
        {contenidoSidebar}
      </aside>

      {/* Sidebar móvil (overlay) */}
      {mobileAbierto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileAbierto(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 border-r border-white/10 bg-navy-900">
            {contenidoSidebar}
          </aside>
        </div>
      )}

      {/* Columna principal con scroll propio */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-navy-950/80 px-4 py-3 backdrop-blur">
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

        <main className="min-h-0 flex-1 overflow-y-auto px-5 py-8 sm:px-8">
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