import type { CSSProperties, ReactNode } from 'react'

type Size = 'sm' | 'md' | 'lg' | 'xl'

const textH: Record<Size, string> = {
  sm: 'h-3',
  md: 'h-4',
  lg: 'h-5',
  xl: 'h-7',
}

const textW: Record<Size, string> = {
  sm: 'w-24',
  md: 'w-32',
  lg: 'w-48',
  xl: 'w-64',
}

/** Bloque base de skeleton (caja animada). */
export function Skeleton({
  className = '',
  style,
}: {
  className?: string
  style?: CSSProperties
}) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden />
}

/** Línea de texto (título/parrafo) con alto y ancho configurable. */
export function SkeletonText({
  size = 'sm',
  className = '',
  width,
}: {
  size?: Size
  className?: string
  width?: string
}) {
  return (
    <Skeleton
      className={`${textH[size]} ${width ?? textW[size]} ${className}`}
    />
  )
}

/** Skeleton tipo tarjeta de panel. */
export function SkeletonCard({
  lines = 3,
  header = true,
}: {
  lines?: number
  header?: boolean
}) {
  return (
    <div className="panel-card animate-pulse p-6">
      {header && <Skeleton className="mb-5 h-5 w-32 rounded-md" />}
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full rounded-md" />
        ))}
      </div>
    </div>
  )
}

/** Skeleton tipo fila de tabla. */
export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 py-3">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4 flex-1 rounded-md"
          style={{ width: `${100 / cols}%` }}
        />
      ))}
    </div>
  )
}

/** Skeleton completo tipo tabla con header y N filas. */
export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="panel-card overflow-hidden p-0">
      <div className="flex items-center gap-4 border-b border-white/10 px-5 py-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-3 rounded-md bg-white/10"
            style={{ width: `${100 / cols}%` }}
          />
        ))}
      </div>
      <div className="divide-y divide-white/5 px-5">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonRow key={i} cols={cols} />
        ))}
      </div>
    </div>
  )
}

/** Grid de tarjetas. */
export function SkeletonGrid({
  cards = 4,
  lines = 3,
}: {
  cards?: number
  lines?: number
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: cards }).map((_, i) => (
        <SkeletonCard key={i} lines={lines} />
      ))}
    </div>
  )
}

/** Wrapper que muestra skeleton mientras `cargando` es true. */
export function WithSkeleton({
  cargando,
  skeleton,
  children,
}: {
  cargando: boolean
  skeleton?: ReactNode
  children: ReactNode
}) {
  if (cargando) return <>{skeleton ?? <SkeletonGrid />}</>
  return <>{children}</>
}

/** Skeleton que imita la tarjeta Section del panel admin. */
export function SectionSkeleton({
  rows = 5,
  lista = true,
}: {
  rows?: number
  lista?: boolean
}) {
  return (
    <div className="panel-card p-6">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <Skeleton className="h-4 w-40 rounded-md" />
          <Skeleton className="mt-2 h-3 w-64 max-w-full rounded-md" />
        </div>
        <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
      </div>
      <div className="mt-5 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-white/5 bg-navy-900/40 px-4 py-3"
          >
            <Skeleton className="h-3 w-14 rounded-md" />
            <Skeleton className="h-3 flex-1 rounded-md" />
            {lista && <Skeleton className="h-5 w-20 rounded-full" />}
          </div>
        ))}
      </div>
    </div>
  )
}

