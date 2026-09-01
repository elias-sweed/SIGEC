import type { Candidata, Evaluacion, EvaluacionDetalle, Jurado } from '../../types/database'

interface EvaluacionesPorCandidata {
  candidata: Candidata
  totalevaluado: number
  porJurado: { jurado: Jurado; promedio: number }[]
}

export default function EvaluacionesPanel({
  candidatas,
  jurados,
  evaluaciones,
  detalles,
  onRecargar,
}: {
  candidatas: Candidata[]
  jurados: Jurado[]
  evaluaciones: Evaluacion[]
  detalles: EvaluacionDetalle[]
  onRecargar: () => Promise<void>
}) {
  const mapa: EvaluacionesPorCandidata[] = candidatas.map((c) => {
    const evalsDeCandidata = evaluaciones.filter((ev) => ev.candidata_id === c.id)
    const porJurado = evalsDeCandidata
      .map((ev) => {
        const dets = detalles
          .filter((d) => d.evaluacion_id === ev.id)
          .reduce((acc, d) => acc + Number(d.puntaje), 0)
        const jurado = jurados.find((j) => j.id === ev.jurado_id)
        return { jurado, promedio: dets }
      })
      .filter((x) => x.jurado) as { jurado: Jurado; promedio: number }[]

    return {
      candidata: c,
      totalevaluado: evalsDeCandidata.length,
      porJurado,
    }
  })

  const totalJurados = jurados.length

  return (
    <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-400">
          Evaluaciones por candidata
        </p>
        <span className="text-xs text-navy-500">Refresca con el botón Recargar</span>
        <button
          onClick={onRecargar}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-navy-200 transition hover:bg-navy-800 hover:text-white"
        >
          ↻ Recargar
        </button>
      </div>

      {candidatas.length === 0 ? (
        <p className="mt-4 text-sm text-navy-500">Sin candidatas registradas.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-widest text-navy-400">
                <th className="pb-2 pr-3 font-semibold">Candidata</th>
                {jurados.map((j) => (
                  <th key={j.id} className="pb-2 pr-3 text-center font-semibold">
                    {j.codigo}
                  </th>
                ))}
                <th className="pb-2 text-center font-semibold">Progreso</th>
              </tr>
            </thead>
            <tbody>
              {mapa.map((m) => (
                <tr key={m.candidata.id} className="border-t border-navy-700/40">
                  <td className="py-2.5 pr-3">
                    <span className="text-white">{m.candidata.nombre}</span>
                    <span className="text-navy-500"> · {m.candidata.grado}</span>
                  </td>
                  {jurados.map((j) => {
                    const fila = m.porJurado.find((p) => p.jurado.id === j.id)
                    return (
                      <td key={j.id} className="py-2.5 pr-3 text-center">
                        {fila ? (
                          <span className="font-mono text-xs font-bold text-gold-400">
                            {fila.promedio}
                          </span>
                        ) : (
                          <span className="text-navy-600">—</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="py-2.5 text-center">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        totalJurados > 0 && m.totalevaluado >= totalJurados
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-navy-600/40 text-navy-400'
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