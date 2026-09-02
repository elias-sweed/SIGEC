import PanelHeader from '../../components/admin/PanelHeader'
import EvaluacionesPanel from '../../components/admin/EvaluacionesPanel'
import { usePanelData } from '../../context/PanelDataContext'

export default function Evaluaciones() {
  const { candidatas, jurados, criterios, evaluaciones, detalles, recargar } = usePanelData()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PanelHeader
        eyebrow="Actividad"
        title="Evaluaciones"
        description="Avance de las evaluaciones por candidata y puntajes recibidos de cada jurado. El total base va sobre 100; el desempate se muestra aparte."
      />

      <EvaluacionesPanel
        candidatas={candidatas}
        jurados={jurados}
        criterios={criterios}
        evaluaciones={evaluaciones}
        detalles={detalles}
        onRecargar={recargar}
      />
    </div>
  )
}