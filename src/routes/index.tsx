import { Route, Routes } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import JuradoLayout from '../layouts/JuradoLayout'
import Home from '../pages/Home'
import MasterPanel from '../pages/MasterPanel'
import PublicScreen from '../pages/PublicScreen'
import JuradoLogin from '../pages/JuradoLogin'
import JuradoEvaluacion from '../pages/JuradoEvaluacion'
import JuradoGuard from '../components/JuradoGuard'
import NotFound from '../pages/NotFound'

export default function AppRoutes() {
  return (
    <Routes>
      {/* Administración y pantalla pública */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/panel" element={<MasterPanel />} />
        <Route path="/pantalla" element={<PublicScreen />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Zona privada del jurado (sin navegación de administración) */}
      <Route element={<JuradoLayout />}>
        <Route path="/jurado" element={<JuradoLogin />} />
        <Route element={<JuradoGuard />}>
          <Route path="/jurado/evaluacion" element={<JuradoEvaluacion />} />
        </Route>
      </Route>
    </Routes>
  )
}