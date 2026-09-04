import type { Candidata } from '../../types/database'

export interface JuradoEnVivo {
  id: string
  nombre: string
  codigo: string
  en_sesion: boolean
  candidata_actual_id: string | null
}

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

function Avatar({
  nombre,
  foto_url,
  tamaño,
  color,
  texto,
}: {
  nombre: string
  foto_url?: string | null
  tamaño: string
  color: string
  texto?: string
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-br font-bold text-white ring-2 ring-white/20 shadow-lg ${tamaño} ${color}`}
    >
      {foto_url ? (
        <img src={foto_url} alt={nombre} className="h-full w-full object-cover" />
      ) : (
        (texto ?? iniciales(nombre))
      )}
    </span>
  )
}

/**
 * Devuelve el ancho de cada tarjeta según el número total de jurados, para que
 * siempre queden centrados y bien repartidos (sin espacio muerto a los lados).
 */
function anchoTarjeta(total: number): string {
  if (total === 1) return 'w-full max-w-sm'
  if (total === 2) return 'w-full sm:w-[46%] max-w-xs'
  if (total === 3) return 'w-full sm:w-[31%] max-w-xs'
  if (total === 4) return 'w-full sm:w-[23%] max-w-[12rem]'
  // 5 o más: envolver de a 3 para no apretar
  return 'w-full sm:w-[31%] max-w-xs'
}

/**
 * Muestra a cada jurado en una tarjeta vertical: nombre del jurado arriba y,
 * debajo, la candidata que está evaluando (en vivo). Las tarjetas se colocan de
 * forma inteligente y centrada según cuántos jurados haya.
 */
export default function PanelJurados({
  jurados,
  candidatas,
}: {
  jurados: JuradoEnVivo[]
  candidatas: Candidata[]
}) {
  const porId = new Map(candidatas.map((c) => [c.id, c]))
  const activos = jurados.filter((j) => j.en_sesion)
  const total = jurados.length
  const ancho = anchoTarjeta(total)

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-gold-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-gold-300 ring-1 ring-gold-500/30">
          Jurados en vivo
        </span>
        <span className="h-px flex-1 bg-linear-to-r from-gold-500/30 to-transparent" />
        <span className="text-[11px] tabular-nums font-semibold text-gold-300">
          {activos.length}/{jurados.length}
        </span>
      </div>

      {total === 0 ? (
        <p className="text-sm text-navy-400">
          Sin jurados registrados por el momento.
        </p>
      ) : (
        <div className="flex flex-wrap items-start justify-center gap-4">
          {jurados.map((j, idx) => {
            const candidata = j.candidata_actual_id ? porId.get(j.candidata_actual_id) : undefined
            const conectado = j.en_sesion
            return (
              <div
                key={j.id}
                className={`${ancho} flex flex-col items-stretch overflow-hidden rounded-2xl border backdrop-blur ${
                  conectado
                    ? 'border-white/10 bg-navy-900/60'
                    : 'border-white/5 bg-navy-950/40 opacity-70'
                }`}
              >
                {/* Encabezado: jurado */}
                <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
                  <Avatar
                    nombre={j.nombre}
                    tamaño="h-12 w-12 text-lg"
                    color={conectado ? COLOR_AVATAR[(idx + 3) % COLOR_AVATAR.length] : 'from-navy-600 to-navy-800'}
                    texto={`${j.nombre[0] ?? 'J'}`}
                  />
                  <div className="min-w-0 text-left">
                    <p className="truncate text-sm font-bold text-white">{j.nombre}</p>
                    <p className="font-mono text-[10px] font-bold text-gold-400">{j.codigo}</p>
                  </div>
                </div>

                {/* Cuerpo: candidata que evalúa */}
                <div className="flex min-h-[96px] flex-col items-center justify-center gap-1.5 px-4 py-4">
                  {!conectado ? (
                    <>
                      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-navy-800/60 text-2xl font-bold text-navy-500 ring-2 ring-white/5">
                        —
                      </span>
                      <p className="text-xs font-semibold text-navy-400">
                        Sin conexión · esperando
                      </p>
                    </>
                  ) : candidata ? (
                    <>
                      <Avatar
                        nombre={candidata.nombre}
                        foto_url={candidata.foto_url}
                        tamaño="h-16 w-16 text-2xl"
                        color={COLOR_AVATAR[idx % COLOR_AVATAR.length]}
                      />
                      <p className="max-w-full truncate text-sm font-bold text-gold-200">
                        {candidata.nombre}
                      </p>
                      <p className="text-[11px] text-navy-300">
                        {candidata.grado}º Grado · Sección {candidata.seccion}
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-navy-700/40 text-2xl font-bold text-navy-400 ring-2 ring-dashed ring-white/15">
                        ?
                      </span>
                      <p className="text-xs font-semibold text-amber-300/90">
                        Seleccionando candidata…
                      </p>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
