import PageHeader from '../components/PageHeader'
import PhaseNotice from '../components/PhaseNotice'

export default function MasterPanel() {
  return (
    <>
      <PageHeader
        eyebrow="Organización"
        title="Panel Maestro"
        description="Centro de control del certamen. Permitirá gestionar participantes, categorías, orden de presentación y la configuración general del evento."
      />
      <PhaseNotice>
        La gestión del certamen estará disponible en las próximas fases del proyecto.
      </PhaseNotice>
    </>
  )
}
