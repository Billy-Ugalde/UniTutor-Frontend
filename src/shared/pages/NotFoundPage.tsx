import { Link } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <GraduationCap className="h-16 w-16 text-primary-600" />
      <h1 className="text-4xl font-bold text-gray-900">404</h1>
      <p className="text-lg text-gray-600">Esta página no existe.</p>
      <p className="text-sm text-gray-400">
        La ruta que buscas no está disponible en UniTutor.
      </p>
      <Link to="/dashboard">
        <Button variant="primary">Volver al inicio</Button>
      </Link>
    </div>
  )
}

