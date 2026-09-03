import { useMemo } from 'react'
import type { Candidata, Criterio, Evaluacion, EvaluacionDetalle, Jurado } from '../../types/database'
import { calcularPromedioJurados, calcularTotales } from '../../utils/scoring'

interface RankingPanelProps {
  candidatas: Candidata[]
  jurados: Jurado[]
  criterios: Criterio[]
  evaluaciones: Evaluacion[]
  detalles: EvaluacionDetalle[]
}

interface FilaRanking {
  candidata: Candidata
  promedio: number
  desempate: number
  incompleto: boolean
  decisionJurado: boolean
}

export default function RankingPanel({
  candidatas,
  jurados,
  criterios,
  evaluaciones,
  detalles,
}: RankingPanelProps) {
  const filas = useMemo<FilaRanking[]>(() => {
    const desempateIds = new Set(criterios.filter((c) => c.es_desempate).map((c) => c.id))

    const base = candidatas.map((c) => {
      const evals = evaluaciones.filter((ev) => ev.candidata_id === c.id && ev.estado === 'completada')
      const porJurado = evals.map((ev) => {
        const dets = detalles
          .filter((d) => d.evaluacion_id === ev.id)
          .map((d) => ({ criterio_id: d.criterio_id, puntaje: Number(d.puntaje) }))
        return calcularTotales(dets, desempateIds)
      })
      return {
        candidata: c,
        promedio: calcularPromedioJurados(porJurado.map((p) => p.base)),
        desempate: Math.round(porJurado.reduce((s, p) => s + p.desempate, 0) * 100) / 100,
        incompleto: evals.length < jurados.length,
        decisionJurado: false,
      }
    })

    const ordenadas = base.sort((a, b) => {
      const porPromedio = b.promedio - a.promedio
      if (Math.abs(porPromedio) > 0.005) return porPromedio
      return b.desempate - a.desempate
    })

    // Empates no resueltos (mismo promedio y mismo desempate): se muestran como
    // "Decisión del Jurado" y no se rompen automáticamente.
    const resultado: FilaRanking[] = []
    let grupo: FilaRanking[] = []
    for (const fila of ordenadas) {
      const cabecera = grupo[0]
      const mismoGrupo =
        cabecera !== undefined &&
        Math.abs(cabecera.promedio - fila.promedio) <= 0.005 &&
        Math.abs(cabecera.desempate - fila.desempate) <= 0.005
      if (!mismoGrupo) {
        resultado.push(...grupo.map((g) => ({ ...g, decisionJurado: grupo.length > 1 })))
        grupo = []
      }
      grupo.push({ ...fila, decisionJurado: false })
    }
    resultado.push(...grupo.map((g) => ({ ...g, decisionJurado: grupo.length > 1 })))
    return resultado
  }, [candidatas, jurados.length, criterios, evaluaciones, detalles])

  const hayPuntajes = filas.some((f) => !f.incompleto)

  return (
    <div className="panel-card p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold-300">
        Ranking automático
      </p>
      <p className="mt-1 text-xs text-navy-400">
        Promedio por candidata (media de jurados) usando los puntajes ya cargados. Los criterios de
        desempate solo se usan para romper empates; si el empate continúa, el puesto queda como
        “Decisión del Jurado” y se resuelve en la reunión del jurado.
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
                <th className="pb-2 text-center font-semibold">Promedio</th>
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
                  <td className="py-3 text-center">
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}