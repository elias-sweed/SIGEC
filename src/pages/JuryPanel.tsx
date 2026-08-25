import PageHeader from '../components/PageHeader'
import PhaseNotice from '../components/PhaseNotice'

export default function JuryPanel() {
  return (
    <>
      <PageHeader
        eyebrow="Evaluación"
        title="Panel del Jurado"
        description="Espacio de trabajo del cuerpo de jurados. En esta vista se registrarán los puntajes y comentarios de cada presentación durante el certamen."
      />
      <PhaseNotice>
        La evaluación de presentaciones estará disponible en las próximas fases del proyecto.
      </PhaseNotice>
    </>
  )
}
