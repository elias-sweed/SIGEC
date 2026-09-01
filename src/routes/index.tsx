import { Route, Routes } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import JuradoLayout from '../layouts/JuradoLayout'
import AdminLayout from '../layouts/AdminLayout'
import Home from '../pages/Home'
import PublicScreen from '../pages/PublicScreen'
import AdminLogin from '../pages/AdminLogin'
import JuradoLogin from '../pages/JuradoLogin'
import JuradoActivar from '../pages/JuradoActivar'
import JuradoEvaluacion from '../pages/JuradoEvaluacion'
import JuradoGuard from '../components/JuradoGuard'
import AdminGuard from '../components/AdminGuard'
import NotFound from '../pages/NotFound'
import Resumen from '../pages/admin/Resumen'
import Evento from '../pages/admin/Evento'
import Candidatas from '../pages/admin/Candidatas'
import Jurados from '../pages/admin/Jurados'
import Criterios from '../pages/admin/Criterios'
import Conectados from '../pages/admin/Conectados'
import Accesos from '../pages/admin/Accesos'
import Evaluaciones from '../pages/admin/Evaluaciones'

export default function AppRoutes() {
  return (
    <Routes>
      {/* Administración y pantalla pública */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/pantalla" element={<PublicScreen />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Zona privada del jurado (sin navegación de administración) */}
      <Route element={<JuradoLayout />}>
        <Route path="/jurado" element={<JuradoLogin />} />
        <Route path="/jurado/activar" element={<JuradoActivar />} />
        <Route element={<JuradoGuard />}>
          <Route path="/jurado/evaluacion" element={<JuradoEvaluacion />} />
        </Route>
      </Route>

      {/* Zona del superadmin (login oculto + dashboard con sidebar) */}
      <Route path="/admin" element={<AdminLogin />} />
      <Route element={<AdminGuard />}>
        <Route path="/panel" element={<AdminLayout />}>
          <Route index element={<Resumen />} />
          <Route path="evento" element={<Evento />} />
          <Route path="candidatas" element={<Candidatas />} />
          <Route path="jurados" element={<Jurados />} />
          <Route path="criterios" element={<Criterios />} />
          <Route path="conectados" element={<Conectados />} />
          <Route path="accesos" element={<Accesos />} />
          <Route path="evaluaciones" element={<Evaluaciones />} />
        </Route>
      </Route>
    </Routes>
  )
}