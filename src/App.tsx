import AppRoutes from './routes'
import { CertamenProvider } from './context/CertamenContext'

export default function App() {
  return (
    <CertamenProvider>
      <AppRoutes />
    </CertamenProvider>
  )
}
