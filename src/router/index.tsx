import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/modules/auth/components/ProtectedRoute'
import { LoginPage } from '@/modules/auth/pages/LoginPage'
import { RegisterPage } from '@/modules/auth/pages/RegisterPage'
import { DashboardPage } from '@/modules/dashboard/pages/DashboardPage'
import { AdminRoute } from '@/modules/admin/components/AdminRoute'
import { AdminDashboardPage } from '@/modules/admin/pages/AdminDashboardPage'
import { InstitutionsManagementPage } from '@/modules/admin/pages/InstitutionsManagementPage'
import { UsersManagementPage } from '@/modules/admin/pages/UsersManagementPage'
import { TutorsManagementPage } from '@/modules/admin/pages/TutorsManagementPage'
import { SubjectsManagementPage } from '@/modules/admin/pages/SubjectsManagementPage'
import { LandingPage } from '@/modules/landing/pages/LandingPage'
import { TutorRoute } from '@/modules/tutor/components/TutorRoute'
import { TutorSubjectsPage } from '@/modules/tutor/pages/TutorSubjectsPage'
import { TutorSubjectDetailPage } from '@/modules/tutor/pages/TutorSubjectDetailPage'
import { TutorSessionsPage } from '@/modules/tutor/pages/TutorSessionsPage'
import { StudentRoute } from '@/modules/student/components/StudentRoute'
import { TutorSearchPage } from '@/modules/student/pages/TutorSearchPage'
import { TutorProfilePage } from '@/modules/student/pages/TutorProfilePage'
import { PublicLayout } from '@/shared/layouts/PublicLayout'
import { AppLayout } from '@/shared/layouts/AppLayout'
import { NotFoundPage } from '@/shared/pages/NotFoundPage'
import { RequestsPage } from '@/modules/requests/pages/RequestsPage'

const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
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
            element: <TutorRoute />,
            children: [
              { path: '/tutor', element: <Navigate to="/tutor/sesiones" replace /> },
              { path: '/tutor/sesiones', element: <TutorSessionsPage /> },
              { path: '/tutor/solicitudes', element: <RequestsPage key="tutor-requests" asTutor /> },
              { path: '/tutor/materias', element: <TutorSubjectsPage /> },
              { path: '/tutor/materias/:subjectId', element: <TutorSubjectDetailPage /> },
            ],
          },
          {
            element: <StudentRoute />,
            children: [
              { path: '/tutores', element: <TutorSearchPage /> },
              { path: '/solicitudes', element: <RequestsPage key="student-requests" /> },
              { path: '/sesiones', element: <RequestsPage key="student-sessions" sessionsOnly /> },
              { path: '/tutores/:tutorId', element: <TutorProfilePage /> },
            ],
          },
          {
            element: <AdminRoute />,
            children: [
              { path: '/admin', element: <AdminDashboardPage /> },
              { path: '/admin/institutions', element: <InstitutionsManagementPage /> },
              { path: '/admin/users', element: <UsersManagementPage /> },
              { path: '/admin/tutors', element: <TutorsManagementPage /> },
              { path: '/admin/subjects', element: <SubjectsManagementPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
