import PanelHeader from '../../components/admin/PanelHeader'
import EvaluacionesPanel from '../../components/admin/EvaluacionesPanel'
import RankingPanel from '../../components/admin/RankingPanel'
import { usePanelData } from '../../context/PanelDataContext'

export default function Evaluaciones() {
  const { candidatas, jurados, criterios, evaluaciones, detalles, recargar } = usePanelData()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PanelHeader
        eyebrow="Actividad"
        title="Evaluaciones"
        description="Avance de las evaluaciones por candidata, puntajes recibidos de cada jurado y ranking automático. El total base va sobre 100; el desempate se muestra aparte."
      />

      <EvaluacionesPanel
        candidatas={candidatas}
        jurados={jurados}
        criterios={criterios}
        evaluaciones={evaluaciones}
        detalles={detalles}
        onRecargar={recargar}
      />

      <RankingPanel
        candidatas={candidatas}
        jurados={jurados}
        criterios={criterios}
        evaluaciones={evaluaciones}
        detalles={detalles}
      />
    </div>
  )
}