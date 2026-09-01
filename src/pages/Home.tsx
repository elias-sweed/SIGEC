import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { esSuperadminAutenticado } from '../lib/adminAuth'
import { useCertamen } from '../context/CertamenContext'
import { EVENT_STATE_LABELS, EVENT_STATE_COLORS } from '../constants/eventStates'

export default function Home() {
  const { eventoCandidato } = useCertamen()
  const [admin, setAdmin] = useState(false)

  useEffect(() => {
    let activo = true
    ;(async () => {
      const ok = await esSuperadminAutenticado()
      if (activo) setAdmin(ok)
    })()
    return () => {
      activo = false
    }
  }, [])

  const evento = eventoCandidato
  const estado = (evento?.estado as keyof typeof EVENT_STATE_LABELS) || 'preparando'
  const stateColors = EVENT_STATE_COLORS[estado]

  const accesos = [
    ...(admin
      ? [
          {
            to: '/panel',
            titulo: 'Centro de Control',
            descripcion: 'Dashboard de administración con configuración y seguimiento del certamen.',
            icono: '⚙',
            etiqueta: 'Administrar',
            destacado: true,
          },
        ]
      : []),
    {
      to: '/pantalla',
      titulo: 'Pantalla Pública',
      descripcion: 'Proyección del certamen en vivo para la audiencia.',
      icono: '📺',
      etiqueta: 'Ver el escenario',
    },
    {
      to: '/jurado',
      titulo: 'Acceso del Jurado',
      descripcion: 'Ingresa con tu código QR para activar tu cuenta y evaluar.',
      icono: '🎖',
      etiqueta: 'Soy jurado',
    },
  ]

  return (
    <div className="space-y-14 text-center">
      {/* Hero */}
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-[-7rem] mx-auto h-[460px] max-w-4xl bg-[radial-gradient(closest-side,rgba(201,162,39,0.18),transparent)]"
        />
        <p className="relative mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-gold-400">
          Certamen de Danza
        </p>
        <h1 className="relative text-5xl font-bold tracking-tight text-white sm:text-7xl">
          {evento ? (
            <>
              {evento.nombre.split(' ')[0]}{' '}
              <span className="text-gold-400">
                {evento.nombre.split(' ').slice(1).join(' ')}
              </span>
            </>
          ) : (
            <>
              Bienvenido a <span className="text-gold-400">SIGEC</span>
            </>
          )}
        </h1>
        <p className="relative mx-auto mt-5 max-w-2xl text-base leading-relaxed text-navy-200 sm:text-lg">
          Sistema Integral de Gestión y Evaluación del Certamen. Organiza, evalúa y proyecta el
          certamen en una sola plataforma.
        </p>

        {/* Estado del evento */}
        {evento && (
          <div className="relative mt-6 flex flex-col items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold ring-1 ${stateColors.bg} ${stateColors.text} ${stateColors.ring}`}
            >
              <span className="h-2 w-2 animate-pulse rounded-full bg-current" />
              {EVENT_STATE_LABELS[estado]}
            </span>
            <p className="text-xs text-navy-400">
              Etapa: <span className="font-semibold text-navy-200">{evento.etapa}</span>
            </p>
          </div>
        )}

        <div className="relative mx-auto mt-8 h-1 w-24 rounded-full bg-gold-500" />
      </div>

      {/* Accesos */}
      <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
        {accesos.map((tarjeta) => (
          <Link
            key={tarjeta.to}
            to={tarjeta.to}
            className={`group block rounded-2xl border p-8 text-left transition-all duration-300 hover:-translate-y-1 ${
              tarjeta.destacado
                ? 'border-gold-500/40 bg-gold-500/5 hover:border-gold-500/70 hover:bg-gold-500/10'
                : 'border-white/10 bg-navy-900/70 hover:border-gold-500/50 hover:bg-navy-900'
            }`}
          >
            <span
              className={`inline-flex h-12 w-12 items-center justify-center rounded-xl text-xl transition-colors ${
                tarjeta.destacado
                  ? 'bg-gold-500 text-navy-950'
                  : 'bg-gold-500/15 text-gold-400 group-hover:bg-gold-500 group-hover:text-navy-950'
              }`}
            >
              {tarjeta.icono}
            </span>
            <h2 className="mt-5 text-xl font-semibold text-white">{tarjeta.titulo}</h2>
            <p className="mt-2 text-sm leading-relaxed text-navy-200">{tarjeta.descripcion}</p>
            <span className="mt-5 inline-block text-sm font-semibold text-gold-400 transition-colors group-hover:text-gold-300">
              {tarjeta.etiqueta} →
            </span>
          </Link>
        ))}
      </div>

      {!admin && (
        <p className="text-xs text-navy-500">
          ¿Eres administrador? Tu acceso está protegido y no se muestra como enlace.
        </p>
      )}
    </div>
  )
}