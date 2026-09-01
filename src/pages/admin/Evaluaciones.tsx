import PanelHeader from '../../components/admin/PanelHeader'
import EvaluacionesPanel from '../../components/admin/EvaluacionesPanel'
import { usePanelData } from '../../context/PanelDataContext'

export default function Evaluaciones() {
  const { candidatas, jurados, evaluaciones, detalles, recargar } = usePanelData()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PanelHeader
        eyebrow="Actividad"
        title="Evaluaciones"
        description="Avance de las evaluaciones por candidata y puntajes recibidos de cada jurado."
      />

      <EvaluacionesPanel
        candidatas={candidatas}
        jurados={jurados}
        evaluaciones={evaluaciones}
        detalles={detalles}
        onRecargar={recargar}
      />
    </div>
  )
}