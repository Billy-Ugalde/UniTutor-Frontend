import { Outlet } from 'react-router-dom'

/**
 * Layout para páginas públicas (login, registro).
 * Fondo neutro centrado, sin sidebar ni navbar de usuario.
 */
export function PublicLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      <Outlet />
    </div>
  )
}

