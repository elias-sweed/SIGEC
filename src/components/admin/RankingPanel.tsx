import { useMemo } from 'react'
import type { Candidata, Criterio, Evaluacion, EvaluacionDetalle, Jurado } from '../../types/database'
import { calcularPromedioJurados, calcularTotales } from '../../utils/scoring'
import { PESO_INTERACCION } from '../../utils/interaccion'

interface RankingPanelProps {
  candidatas: Candidata[]
  jurados: Jurado[]
  criterios: Criterio[]
  evaluaciones: Evaluacion[]
  detalles: EvaluacionDetalle[]
  interaccion?: { puntos: Record<string, number>; votos?: Record<string, number> }
}

interface FilaRanking {
  candidata: Candidata
  promedio: number
  desempate: number
  interaccion: number
  votos: number
  total: number
  incompleto: boolean
  decisionJurado: boolean
}

export default function RankingPanel({
  candidatas,
  jurados,
  criterios,
  evaluaciones,
  detalles,
  interaccion,
}: RankingPanelProps) {
  const filas = useMemo<FilaRanking[]>(() => {
    const desempateIds = new Set(criterios.filter((c) => c.es_desempate).map((c) => c.id))
    const puntosPubl = interaccion?.puntos ?? {}
    const votosPubl = interaccion?.votos ?? {}

    const base = candidatas.map((c) => {
      const evals = evaluaciones.filter((ev) => ev.candidata_id === c.id && ev.estado === 'completada')
      const porJurado = evals.map((ev) => {
        const dets = detalles
          .filter((d) => d.evaluacion_id === ev.id)
          .map((d) => ({ criterio_id: d.criterio_id, puntaje: Number(d.puntaje) }))
        return calcularTotales(dets, desempateIds)
      })
      const promedio = calcularPromedioJurados(porJurado.map((p) => p.base))
      const interaccionPts = puntosPubl[c.id] ?? 0
      return {
        candidata: c,
        promedio,
        desempate: Math.round(porJurado.reduce((s, p) => s + p.desempate, 0) * 100) / 100,
        interaccion: interaccionPts,
        votos: votosPubl[c.id] ?? 0,
        total: Math.round((promedio + interaccionPts) * 100) / 100,
        incompleto: evals.length < jurados.length,
        decisionJurado: false,
      }
    })

    const ordenadas = base.sort((a, b) => {
      const porTotal = b.total - a.total
      if (Math.abs(porTotal) > 0.005) return porTotal
      const porDesempate = b.desempate - a.desempate
      if (Math.abs(porDesempate) > 0.005) return porDesempate
      return b.promedio - a.promedio
    })

    // Empates no resueltos (mismo total y mismo desempate): se muestran como
    // "Decisión del Jurado" y no se rompen automáticamente.
    const resultado: FilaRanking[] = []
    let grupo: FilaRanking[] = []
    for (const fila of ordenadas) {
      const cabecera = grupo[0]
      const mismoGrupo =
        cabecera !== undefined &&
        Math.abs(cabecera.total - fila.total) <= 0.005 &&
        Math.abs(cabecera.desempate - fila.desempate) <= 0.005
      if (!mismoGrupo) {
        resultado.push(...grupo.map((g) => ({ ...g, decisionJurado: grupo.length > 1 })))
        grupo = []
      }
      grupo.push({ ...fila, decisionJurado: false })
    }
    resultado.push(...grupo.map((g) => ({ ...g, decisionJurado: grupo.length > 1 })))
    return resultado
  }, [candidatas, jurados.length, criterios, evaluaciones, detalles, interaccion])

  const hayPuntajes = filas.some((f) => !f.incompleto)
  const hayInteraccion = interaccion !== undefined && Object.values(interaccion.puntos).some((p) => p > 0)

  return (
    <div className="panel-card p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold-300">
        Ranking automático
      </p>
      <p className="mt-1 text-xs text-navy-400">
        Total por candidata = promedio del jurado (/100) + interacción pública de la votación QR
        {hayInteraccion ? ` (hasta ${PESO_INTERACCION} pts)` : ''}
        {hayInteraccion ? ', si hay votos en este evento.' : '. Los criterios de desempate solo se usan para romper empates; si el empate continúa, el puesto queda como “Decisión del Jurado”.'}
      </p>

      {!hayPuntajes ? (
        <p className="mt-4 text-sm text-navy-400/80">
          Aún no hay evaluaciones completas para este evento.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-widest text-navy-400">
                <th className="pb-2 pr-3 font-semibold">Puesto</th>
                <th className="pb-2 pr-3 font-semibold">Candidata</th>
                <th className="pb-2 pr-3 text-center font-semibold">Promedio</th>
                {hayInteraccion && (
                  <th className="pb-2 pr-3 text-center font-semibold">Público</th>
                )}
                <th className="pb-2 text-center font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f, i) => (
                <tr key={f.candidata.id} className="border-t border-white/10 transition-colors hover:bg-white/3">
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
                    <span className="text-white">{f.candidata.nombre}</span>
                    <span className="text-navy-500"> · {f.candidata.grado}</span>
                    {f.incompleto && (
                      <span className="ml-2 rounded-full bg-navy-700/40 px-2 py-0.5 text-[10px] font-semibold text-navy-300">
                        en curso
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-3 text-center">
                    <div className="flex flex-col items-center">
                      <span className="font-mono text-base font-bold tabular-nums text-gold-300">
                        {f.promedio.toFixed(2)}
                      </span>
                      {f.desempate > 0 && (
                        <span className="font-mono text-[10px] text-gold-400/70">
                          +{f.desempate} desempate
                        </span>
                      )}
                      {f.decisionJurado && (
                        <span className="mt-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300 ring-1 ring-amber-500/30">
                          Decisión del Jurado
                        </span>
                      )}
                    </div>
                  </td>
                  {hayInteraccion && (
                    <td className="py-3 pr-3 text-center">
                      <span className="font-mono text-sm font-bold tabular-nums text-sky-300">
                        +{f.interaccion.toFixed(2)}
                      </span>
                      <span className="block font-mono text-[10px] text-navy-400">
                        {f.votos} voto{f.votos === 1 ? '' : 's'}
                      </span>
                    </td>
                  )}
                  <td className="py-3 text-center">
                    <div className="flex flex-col items-center">
                      <span
                        className={`font-mono text-base font-black tabular-nums ${
                          i === 0 ? 'text-white' : 'text-navy-100'
                        }`}
                      >
                        {f.total.toFixed(2)}
                      </span>
                      <span className="font-mono text-[10px] text-navy-400">{100 + PESO_INTERACCION} pts</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hayInteraccion && (
        <p className="mt-4 rounded-xl bg-sky-500/10 px-3 py-2 text-[11px] text-sky-300">
          La interacción pública suma hasta {PESO_INTERACCION} pts: cada candidata recibe{' '}
          {PESO_INTERACCION} × (sus votos ÷ votos de la más votada). Solo cuentan los votos emitidos
          por la votación QR (gratis y de pago verificado).
        </p>
      )}
    </div>
  )
}