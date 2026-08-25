import { Route, Routes } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import Home from '../pages/Home'
import JuryPanel from '../pages/JuryPanel'
import MasterPanel from '../pages/MasterPanel'
import PublicScreen from '../pages/PublicScreen'
import NotFound from '../pages/NotFound'

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/jurado" element={<JuryPanel />} />
        <Route path="/maestro" element={<MasterPanel />} />
        <Route path="/publico" element={<PublicScreen />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
