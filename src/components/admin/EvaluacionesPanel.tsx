import type { Candidata, Criterio, Evaluacion, EvaluacionDetalle, Jurado } from '../../types/database'

interface EvaluacionesPorCandidata {
  candidata: Candidata
  totalevaluado: number
  porJurado: { jurado: Jurado; promedio: number; desempate: number }[]
}

export default function EvaluacionesPanel({
  candidatas,
  jurados,
  criterios,
  evaluaciones,
  detalles,
  onRecargar,
}: {
  candidatas: Candidata[]
  jurados: Jurado[]
  criterios: Criterio[]
  evaluaciones: Evaluacion[]
  detalles: EvaluacionDetalle[]
  onRecargar: () => Promise<void>
}) {
  const desempateIds = new Set(
    criterios.filter((c) => c.es_desempate).map((c) => c.id),
  )
  const hayDesempate = desempateIds.size > 0

  const mapa: EvaluacionesPorCandidata[] = candidatas.map((c) => {
    const evalsDeCandidata = evaluaciones.filter((ev) => ev.candidata_id === c.id)
    const porJurado = evalsDeCandidata
      .map((ev) => {
        let base = 0
        let desempate = 0
        for (const d of detalles.filter((d) => d.evaluacion_id === ev.id)) {
          if (desempateIds.has(d.criterio_id ?? '')) desempate += Number(d.puntaje)
          else base += Number(d.puntaje)
        }
        const jurado = jurados.find((j) => j.id === ev.jurado_id)
        return { jurado, promedio: base, desempate }
      })
      .filter((x) => x.jurado) as { jurado: Jurado; promedio: number; desempate: number }[]

    return {
      candidata: c,
      totalevaluado: evalsDeCandidata.length,
      porJurado,
    }
  })

  const totalJurados = jurados.length

  return (
    <div className="panel-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold-300">
          Evaluaciones por candidata
        </p>
        <span className="text-xs text-navy-400">Refresca con el botón Recargar</span>
        <button
          onClick={onRecargar}
          className="btn-ghost"
        >
          ↻ Recargar
        </button>
      </div>

      {candidatas.length === 0 ? (
        <p className="mt-4 text-sm text-navy-400/80">Sin candidatas registradas.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-widest text-navy-400">
                <th className="pb-2 pr-3 font-semibold">Candidata</th>
                {jurados.map((j) => (
                  <th key={j.id} className="pb-2 pr-3 text-center font-semibold">
                    {j.codigo}
                    {hayDesempate && (
                      <span className="block text-[9px] font-bold text-gold-300/70">
                        +desempate
                      </span>
                    )}
                  </th>
                ))}
                <th className="pb-2 text-center font-semibold">Progreso</th>
              </tr>
            </thead>
            <tbody>
              {mapa.map((m) => (
                <tr key={m.candidata.id} className="border-t border-white/10 transition-colors hover:bg-white/[0.03]">
                  <td className="py-3 pr-3">
                    <span className="text-white">{m.candidata.nombre}</span>
                    <span className="text-navy-500"> · {m.candidata.grado}</span>
                  </td>
                  {jurados.map((j) => {
                    const fila = m.porJurado.find((p) => p.jurado.id === j.id)
                    return (
                      <td key={j.id} className="py-3 pr-3 text-center">
                        {fila ? (
                          <div className="flex flex-col items-center">
                            <span className="font-mono text-xs font-bold text-gold-300">
                              {fila.promedio}
                            </span>
                            {hayDesempate && (
                              <span className="font-mono text-[10px] text-gold-400/70">
                                +{fila.desempate}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-navy-600">—</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="py-3 text-center">
                    <span
                      className={`chip ${
                        totalJurados > 0 && m.totalevaluado >= totalJurados ? 'chip-ok' : 'chip-muted'
                      }`}
                    >
                      {m.totalevaluado}/{totalJurados}
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