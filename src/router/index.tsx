import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'

// Auth module
import { ProtectedRoute } from '@/modules/auth/components/ProtectedRoute'
import { LoginPage } from '@/modules/auth/pages/LoginPage'
import { RegisterPage } from '@/modules/auth/pages/RegisterPage'

// Dashboard module
import { DashboardPage } from '@/modules/dashboard/pages/DashboardPage'

// Shared
import { PublicLayout } from '@/shared/layouts/PublicLayout'
import { AppLayout } from '@/shared/layouts/AppLayout'
import { NotFoundPage } from '@/shared/pages/NotFoundPage'

const router = createBrowserRouter([
  // ── Rutas públicas ─────────────────────────────────────────
  {
    element: <PublicLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },

  // ── Rutas protegidas ───────────────────────────────────────
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },

          // Próximos módulos se agregarán aquí:
          // { path: '/tutors',    element: <TutorsPage /> },
          // { path: '/requests',  element: <RequestsPage /> },
          // { path: '/sessions',  element: <SessionsPage /> },
          // { path: '/admin',     element: <AdminPage /> },
        ],
      },
    ],
  },

  // ── Redireccionamientos ────────────────────────────────────
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '*', element: <NotFoundPage /> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
