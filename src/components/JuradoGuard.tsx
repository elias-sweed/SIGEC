import { Navigate, Outlet } from 'react-router-dom'
import { leerSesionJurado } from '../utils/session'

export default function JuradoGuard() {
  const sesion = leerSesionJurado()

  if (!sesion) {
    return <Navigate to="/jurado" replace />
  }

  return <Outlet />
}