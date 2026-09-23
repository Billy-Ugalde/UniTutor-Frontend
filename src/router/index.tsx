import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/modules/auth/components/ProtectedRoute'
import { LoginPage } from '@/modules/auth/pages/LoginPage'
import { RegisterPage } from '@/modules/auth/pages/RegisterPage'
import { DashboardPage } from '@/modules/dashboard/pages/DashboardPage'
import { AdminRoute } from '@/modules/admin/components/AdminRoute'
import { AdminDashboardPage } from '@/modules/admin/pages/AdminDashboardPage'
import { InstitutionsManagementPage } from '@/modules/admin/pages/InstitutionsManagementPage'
import { UsersManagementPage } from '@/modules/admin/pages/UsersManagementPage'
import { SubjectsManagementPage } from '@/modules/admin/pages/SubjectsManagementPage'
import { PublicLayout } from '@/shared/layouts/PublicLayout'
import { AppLayout } from '@/shared/layouts/AppLayout'
import { NotFoundPage } from '@/shared/pages/NotFoundPage'

const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          {
            element: <AdminRoute />,
            children: [
              { path: '/admin', element: <AdminDashboardPage /> },
              { path: '/admin/institutions', element: <InstitutionsManagementPage /> },
              { path: '/admin/users', element: <UsersManagementPage /> },
              { path: '/admin/subjects', element: <SubjectsManagementPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '*', element: <NotFoundPage /> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
