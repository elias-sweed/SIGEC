import { useEffect, useMemo, useState } from 'react'
import type { Candidata } from '../../types/database'

const ORDEN_GRADO: Record<string, number> = { '1': 1, '2': 2, '3': 3, '4': 4, '5': 5 }

const COLOR_AVATAR = [
  'from-gold-400 to-gold-600',
  'from-navy-400 to-navy-600',
  'from-rose-400 to-rose-600',
  'from-emerald-400 to-emerald-600',
  'from-sky-400 to-sky-600',
  'from-purple-400 to-purple-600',
]

function iniciales(nombre: string) {
  return nombre
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function ordenarCandidatas(lista: Candidata[]): Candidata[] {
  return [...lista].sort((a, b) => {
    const g = (ORDEN_GRADO[a.grado] ?? 99) - (ORDEN_GRADO[b.grado] ?? 99)
    if (g !== 0) return g
    const s = a.seccion.localeCompare(b.seccion)
    if (s !== 0) return s
    return a.nombre.localeCompare(b.nombre)
  })
}

function CirculoCandidata({
  candidata,
  indice,
  tam,
  onClick,
}: {
  candidata: Candidata
  indice: number
  tam: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-1.5 focus:outline-none"
      title="Ver en grande"
    >
      <span className="relative">
        <span
          className={`flex items-center justify-center overflow-hidden rounded-full bg-linear-to-br font-bold text-white ring-2 ring-white/15 shadow-lg transition group-hover:ring-gold-300/60 ${tam} ${COLOR_AVATAR[indice % COLOR_AVATAR.length]}`}
        >
          {candidata.foto_url ? (
            <img
              src={candidata.foto_url}
              alt={candidata.nombre}
              className="h-full w-full object-cover"
            />
          ) : (
            iniciales(candidata.nombre)
          )}
        </span>
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-navy-950/0 text-white opacity-0 transition group-hover:bg-navy-950/40 group-hover:opacity-100">
          <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </span>
      </span>
      <span className="max-w-20 truncate text-center text-[11px] font-semibold text-white/85">
        {candidata.nombre}
      </span>
      <span className="text-[10px] text-navy-300">
        {candidata.grado}º · Sección {candidata.seccion}
      </span>
    </button>
  )
}

function ModalCandidata({
  candidata,
  onClose,
}: {
  candidata: Candidata
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-950/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md animate-fade-in overflow-hidden rounded-3xl border border-gold-500/40 bg-navy-900 shadow-2xl shadow-gold-500/20"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-navy-950/60 text-white/80 ring-1 ring-white/15 transition hover:bg-navy-950 hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={2.5}>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="relative aspect-[4/5] w-full overflow-hidden bg-navy-800">
          {candidata.foto_url ? (
            <img src={candidata.foto_url} alt={candidata.nombre} className="h-full w-full object-cover" />
          ) : (
            <div
              className={`flex h-full w-full items-center justify-center bg-linear-to-br text-8xl font-black text-white ${COLOR_AVATAR[0]}`}
            >
              {iniciales(candidata.nombre)}
            </div>
          )}
        </div>

        <div className="px-6 py-5 text-center">
          <p className="text-2xl font-bold text-white">{candidata.nombre}</p>
          <p className="mt-1 text-sm text-gold-300">
            {candidata.grado}º Grado · Sección {candidata.seccion}
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Cuadrícula de candidatas ordenada por grado (1→5) y sección.
 * Muestra primero las pendientes y, en una fila destacada, las ya evaluadas.
 * Al hacer clic en un círculo se abre un modal con la foto en grande.
 */
export default function CandidatasGrid({
  candidatas,
  evaluadasIds,
  compacto = false,
}: {
  candidatas: Candidata[]
  evaluadasIds: Set<string>
  compacto?: boolean
}) {
  const [seleccionada, setSeleccionada] = useState<Candidata | null>(null)

  const { pendientes, evaluadas } = useMemo(() => {
    const ordenadas = ordenarCandidatas(candidatas)
    const p = ordenadas.filter((c) => !evaluadasIds.has(c.id))
    const e = ordenadas.filter((c) => evaluadasIds.has(c.id))
    return { pendientes: p, evaluadas: e }
  }, [candidatas, evaluadasIds])

  const tamCirculo = compacto ? 'h-14 w-14 text-lg' : 'h-20 w-20 text-xl'

  return (
    <div className="w-full space-y-6">
      {evaluadas.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400 ring-1 ring-emerald-500/30">
              ✔ Ya evaluadas
            </span>
            <span className="h-px flex-1 bg-linear-to-r from-emerald-500/30 to-transparent" />
          </div>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-4">
            {evaluadas.map((c) => (
              <CirculoCandidata
                key={c.id}
                candidata={c}
                indice={pendientes.length + evaluadas.indexOf(c)}
                tam={tamCirculo}
                onClick={() => setSeleccionada(c)}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        {evaluadas.length > 0 && (
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-full bg-gold-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-gold-300 ring-1 ring-gold-500/30">
              En escenario / por evaluar
            </span>
            <span className="h-px flex-1 bg-linear-to-r from-gold-500/30 to-transparent" />
          </div>
        )}
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-4">
          {pendientes.map((c) => (
            <CirculoCandidata
              key={c.id}
              candidata={c}
              indice={pendientes.indexOf(c)}
              tam={tamCirculo}
              onClick={() => setSeleccionada(c)}
            />
          ))}
        </div>
      </div>

      {seleccionada && (
        <ModalCandidata candidata={seleccionada} onClose={() => setSeleccionada(null)} />
      )}
    </div>
  )
}
