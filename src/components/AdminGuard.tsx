import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { esSuperadminAutenticado } from '../lib/adminAuth'

/**
 * Protege las rutas de administración: requiere sesión de superadmin.
 * Si no hay sesión, redirige al login `/admin`.
 */
export default function AdminGuard() {
  const [autenticado, setAutenticado] = useState<boolean | null>(null)

  useEffect(() => {
    let activo = true
    ;(async () => {
      const ok = await esSuperadminAutenticado()
      if (activo) setAutenticado(ok)
    })()
    return () => {
      activo = false
    }
  }, [])

  if (autenticado === null) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-navy-400">Verificando acceso…</p>
      </div>
    )
  }

  if (!autenticado) {
    return <Navigate to="/admin" replace />
  }

  return <Outlet />
}
