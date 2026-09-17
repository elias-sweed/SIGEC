import { useEffect, useState } from 'react'
import { contarVotosPublicos, type ConteoVotosCandidata } from '../../services/votacion.service'
import type { Candidata } from '../../types/database'
import { logError } from '../../utils/devlog'

interface VotoPopularPanelProps {
  eventoId: string | null
  candidatas: Candidata[]
}

/**
 * Categoría APARTE de la evaluación de jurados: muestra el conteo de votos
 * del público por candidata (gratis + pagados). No modifica el puntaje de
 * jurados, el ranking automático ni las actas oficiales.
 */
export default function VotoPopularPanel({ eventoId, candidatas }: VotoPopularPanelProps) {
  const [conteo, setConteo] = useState<ConteoVotosCandidata[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let activo = true
    setCargando(true)
    if (!eventoId) {
      setConteo([])
      setCargando(false)
      return
    }
    ;(async () => {
      try {
        const datos = await contarVotosPublicos(eventoId)
        if (activo) setConteo(datos)
      } catch (err) {
        logError('VotoPopularPanel', err instanceof Error ? err.message : String(err))
      } finally {
        if (activo) setCargando(false)
      }
    })()
    return () => {
      activo = false
    }
  }, [eventoId])

  const filas = conteo
    .map((c) => {
      const candidata = candidatas.find((x) => x.id === c.candidata_id)
      return { voto: c, candidata }
    })
    .filter((f) => f.candidata)
    .sort((a, b) => b.voto.total - a.voto.total)

  const totalVotos = conteo.reduce((s, c) => s + c.total, 0)

  return (
    <div className="panel-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold-300">
            Voto popular
          </p>
          <p className="mt-1 text-xs text-navy-400">
            Categoría aparte: no cambia el puntaje de jurados ni el ranking oficial. Muestra los
            votos del público por candidata (gratis + pagados).
          </p>
        </div>
        <span className="rounded-full bg-navy-700/40 px-3 py-1 text-[11px] font-bold tabular-nums text-navy-200 ring-1 ring-white/10">
          {totalVotos} votos
        </span>
      </div>

      {cargando ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-xl bg-navy-800/60" />
          ))}
        </div>
      ) : filas.length === 0 ? (
        <p className="mt-4 text-sm text-navy-400/80">Aún no hay votos del público en este evento.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-widest text-navy-400">
                <th className="pb-2 pr-3 font-semibold">Puesto</th>
                <th className="pb-2 pr-3 font-semibold">Candidata</th>
                <th className="pb-2 text-center font-semibold">Gratis</th>
                <th className="pb-2 text-center font-semibold">Pagados</th>
                <th className="pb-2 text-center font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f, i) => (
                <tr key={f.voto.candidata_id} className="border-t border-white/10 transition-colors hover:bg-white/3">
                  <td className="py-3 pr-3">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        i === 0
                          ? 'bg-gold-500 text-navy-950'
                          : 'bg-navy-700/60 font-semibold text-navy-200'
                      }`}
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td className="py-3 pr-3">
                    <span className="text-white">{f.candidata!.nombre}</span>
                    <span className="text-navy-500"> · {f.candidata!.grado}º</span>
                  </td>
                  <td className="py-3 text-center">
                    <span className="font-mono tabular-nums text-navy-200">{f.voto.gratis}</span>
                  </td>
                  <td className="py-3 text-center">
                    <span className="font-mono tabular-nums text-gold-300">{f.voto.pagados}</span>
                  </td>
                  <td className="py-3 text-center">
                    <span className="font-mono text-base font-bold tabular-nums text-gold-300">
                      {f.voto.total}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}