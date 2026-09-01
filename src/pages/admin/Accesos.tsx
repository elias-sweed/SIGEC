import PanelHeader from '../../components/admin/PanelHeader'
import AccesosJurados from '../../components/admin/AccesosJurados'
import { usePanelData } from '../../context/PanelDataContext'

export default function Accesos() {
  const { evento, jurados } = usePanelData()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PanelHeader
        eyebrow="Actividad"
        title="Accesos para jurados"
        description="Genera las tarjetas QR de acceso que el jurado escaneará para activar su cuenta."
      />

      <AccesosJurados jurados={jurados} eventoNombre={evento?.nombre ?? 'Certamen de danza'} />
    </div>
  )
}