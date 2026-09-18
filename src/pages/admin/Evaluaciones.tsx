import { useCallback, useEffect, useState } from 'react'
import PanelHeader from '../../components/admin/PanelHeader'
import EvaluacionesPanel from '../../components/admin/EvaluacionesPanel'
import RankingPanel from '../../components/admin/RankingPanel'
import { SectionSkeleton } from '../../components/Skeleton'
import { usePanelData } from '../../context/PanelDataContext'
import { contarVotosPorCandidata } from '../../services/votacion.service'
import { calcularPuntosInteraccion, type InteraccionCalculada } from '../../utils/interaccion'

const INTERACCION_VACIA: InteraccionCalculada = { puntos: {}, votos: {}, maxVotos: 0 }

export default function Evaluaciones() {
  const { evento, candidatas, jurados, criterios, evaluaciones, detalles, cargandoInicial, recargar } =
    usePanelData()

  const [interaccion, setInteraccion] = useState<InteraccionCalculada>(INTERACCION_VACIA)

  const cargarInteraccion = useCallback(async () => {
    if (!evento?.id) {
      setInteraccion(INTERACCION_VACIA)
      return
    }
    const conteo = await contarVotosPorCandidata(evento.id)
    setInteraccion(calcularPuntosInteraccion(conteo))
  }, [evento?.id])

  useEffect(() => {
    void cargarInteraccion()
  }, [cargarInteraccion])

  const onRecargar = useCallback(async () => {
    await recargar()
    await cargarInteraccion()
  }, [recargar, cargarInteraccion])

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PanelHeader
        eyebrow="Actividad"
        title="Evaluaciones"
        description="Avance de las evaluaciones por candidata, puntajes recibidos de cada jurado y ranking automático. El total final suma el promedio del jurado (/100) más la interacción pública de la votación QR (hasta 10 pts) cuando el evento tiene votos."
      />

      {cargandoInicial ? (
        <>
          <SectionSkeleton rows={4} />
          <SectionSkeleton rows={3} />
        </>
      ) : (
        <>
          <EvaluacionesPanel
            candidatas={candidatas}
            jurados={jurados}
            criterios={criterios}
            evaluaciones={evaluaciones}
            detalles={detalles}
            totalCriterios={criterios.filter((c) => c.etapa === evento?.etapa).length}
            onRecargar={onRecargar}
          />

          <RankingPanel
            candidatas={candidatas}
            jurados={jurados}
            criterios={criterios}
            evaluaciones={evaluaciones}
            detalles={detalles}
            interaccion={interaccion}
          />
        </>
      )}
    </div>
  )
}