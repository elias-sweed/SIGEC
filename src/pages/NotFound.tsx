import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'

export default function NotFound() {
  return (
    <>
      <PageHeader
        eyebrow="Error 404"
        title="Página no encontrada"
        description="La ruta que buscas no existe o fue movida dentro de SIGEC."
      />
      <div className="mt-10 text-center">
        <Link to="/" className="btn-primary">
          Volver al Inicio
        </Link>
      </div>
    </>
  )
}
