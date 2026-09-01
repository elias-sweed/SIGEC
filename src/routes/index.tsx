import { Route, Routes } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import JuradoLayout from '../layouts/JuradoLayout'
import Home from '../pages/Home'
import MasterPanel from '../pages/MasterPanel'
import PublicScreen from '../pages/PublicScreen'
import AdminLogin from '../pages/AdminLogin'
import JuradoLogin from '../pages/JuradoLogin'
import JuradoActivar from '../pages/JuradoActivar'
import JuradoEvaluacion from '../pages/JuradoEvaluacion'
import JuradoGuard from '../components/JuradoGuard'
import AdminGuard from '../components/AdminGuard'
import NotFound from '../pages/NotFound'

export default function AppRoutes() {
  return (
    <Routes>
      {/* Administración y pantalla pública */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route element={<AdminGuard />}>
          <Route path="/panel" element={<MasterPanel />} />
        </Route>
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
    </Routes>
  )
}