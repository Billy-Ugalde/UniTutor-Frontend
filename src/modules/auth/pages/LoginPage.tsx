import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Card } from '@/shared/components/ui/Card'
import { toast } from '@/shared/store/toast.store'

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const successMessage = (location.state as { message?: string } | null)?.message

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (successMessage) {
      toast.success('¡Registro completado!', successMessage)
    }
  }, [successMessage])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await signIn(email, password)
      toast.success('¡Bienvenido a UniTutor!', 'Has iniciado sesión correctamente.')
      navigate('/dashboard')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión.'
      if (message.includes('desactivada')) {
        setError(message)
        toast.error('Acceso denegado', message, 6000)
      } else if (message.includes('Invalid login credentials')) {
        const errorText = 'Correo o contraseña incorrectos.'
        setError(errorText)
        toast.error('Credenciales incorrectas', errorText)
      } else if (message.includes('Email not confirmed')) {
        const warnText = 'Debes confirmar tu correo electrónico antes de ingresar.'
        setError(warnText)
        toast.warning('Confirmación requerida', warnText)
      } else {
        setError(message)
        toast.error('Error al ingresar', message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-700 mb-3">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold text-primary-700">UniTutor</h1>
          <p className="mt-2 text-gray-600">Plataforma de tutorías universitarias</p>
        </div>

        {successMessage && (
          <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        <Card>
          <Card.Header>
            <h2 className="text-lg font-semibold text-gray-900">Iniciar sesión</h2>
            <p className="mt-1 text-sm text-gray-500">
              Ingresa con tu correo institucional
            </p>
          </Card.Header>

          <Card.Body>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="Correo electrónico"
                type="email"
                placeholder="usuario@universidad.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <Input
                label="Contraseña"
                type="password"
                placeholder="Tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <Button type="submit" fullWidth isLoading={isLoading}>
                Ingresar
              </Button>
            </form>
          </Card.Body>

          <Card.Footer>
            <p className="text-center text-sm text-gray-500">
              ¿No tienes cuenta?{' '}
              <Link
                to="/register"
                className="font-medium text-primary-600 hover:text-primary-700"
              >
                Regístrate aquí
              </Link>
            </p>
          </Card.Footer>
        </Card>
      </div>
    </div>
  )
}

