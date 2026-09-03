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

function MiniAvatar({
  candidata,
  indice,
}: {
  candidata: Candidata
  indice: number
}) {
  return (
    <span
      className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-br text-sm font-bold text-white ring-2 ring-white/20 ${COLOR_AVATAR[indice % COLOR_AVATAR.length]}`}
    >
      {candidata.foto_url ? (
        <img src={candidata.foto_url} alt={candidata.nombre} className="h-full w-full object-cover" />
      ) : (
        iniciales(candidata.nombre)
      )}
    </span>
  )
}

/**
 * Muestra a cada jurado con su nombre y a qué candidata está evaluando en vivo.
 * Es la vista que resuelve "qué pasa si varios jurados evalúan a la vez": cada
 * tarjeta refleja la candidata de cada jurado en tiempo real.
 */
export default function PanelJurados({
  jurados,
  candidatas,
}: {
  jurados: JuradoEnVivo[]
  candidatas: Candidata[]
}) {
  const porId = new Map(candidatas.map((c) => [c.id, c]))

  return (
    <div className="w-full max-w-4xl space-y-4">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-gold-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-gold-300 ring-1 ring-gold-500/30">
          Jurados en vivo
        </span>
        <span className="h-px flex-1 bg-linear-to-r from-gold-500/30 to-transparent" />
      </div>

      {jurados.length === 0 ? (
        <p className="text-sm text-navy-400">
          Sin jurados activos por el momento. Cada jurado aparecerá aquí al iniciar sesión.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {jurados
            .filter((j) => j.en_sesion)
            .map((j, idx) => {
              const candidata = j.candidata_actual_id ? porId.get(j.candidata_actual_id) : undefined
              return (
                <div
                  key={j.id}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-navy-900/60 px-4 py-3 backdrop-blur"
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br text-base font-bold text-navy-950 ${COLOR_AVATAR[(idx + 3) % COLOR_AVATAR.length]}`}
                  >
                    {iniciales(j.nombre)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">
                      {j.nombre}
                      <span className="ml-1.5 font-mono text-[10px] font-bold text-gold-400">{j.codigo}</span>
                    </p>
                    {candidata ? (
                      <div className="mt-1 flex min-w-0 items-center gap-2">
                        <MiniAvatar candidata={candidata} indice={idx} />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-gold-200">
                            Evaluando: {candidata.nombre}
                          </p>
                          <p className="text-[10px] text-navy-300">
                            {candidata.grado}º · Sección {candidata.seccion}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-0.5 text-xs font-semibold text-amber-300/90">
                        Seleccionando candidata…
                      </p>
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
