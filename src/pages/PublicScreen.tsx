import PageHeader from '../components/PageHeader'
import PhaseNotice from '../components/PhaseNotice'

export default function PublicScreen() {
  return (
    <>
      <PageHeader
        eyebrow="Audiencia"
        title="Pantalla Pública"
        description="Proyección diseñada para la audiencia del evento. Mostrará en vivo la información del certamen y los resultados anunciados por la organización."
      />
      <PhaseNotice>
        La transmisión pública estará disponible en las próximas fases del proyecto.
      </PhaseNotice>
    </>
  )
}
