import { useTranslations } from '@/i18n/useTranslations'
import { useState, useEffect, useRef, type FormEvent } from 'react'
import type { TranslationKey } from '@/i18n/core'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Card } from '@/shared/components/ui/Card'
import { toast } from '@/shared/store/toast.store'

export function LoginPage() {
  const { t } = useTranslations()
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const registrationState = location.state as { message?: string; messageKey?: TranslationKey } | null
  const successMessage = registrationState?.messageKey
    ? t(registrationState.messageKey) : registrationState?.message
  const notifiedRegistration = useRef<string | null>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (successMessage && notifiedRegistration.current !== location.key) {
      notifiedRegistration.current = location.key
      toast.success(t("¡Registro completado!"), successMessage)
    }
  }, [successMessage, location.key, t])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await signIn(email, password)
      toast.success(t("¡Bienvenido a UniTutor!"), t("Has iniciado sesión correctamente."))
      navigate('/dashboard')
    } catch (err) {
      const message = err instanceof Error ? err.message : t("Error al iniciar sesión.")
      if (message.includes('desactivada')) {
        const errorText = t('Esta cuenta ha sido desactivada. Comunícate con el administrador de tu institución.')
        setError(errorText)
        toast.error(t("Acceso denegado"), errorText, 6000)
      } else if (message.includes('Invalid login credentials')) {
        const errorText = t("Correo o contraseña incorrectos.")
        setError(errorText)
        toast.error(t("Credenciales incorrectas"), errorText)
      } else if (message.includes('Email not confirmed')) {
        const warnText = t("Debes confirmar tu correo electrónico antes de ingresar.")
        setError(warnText)
        toast.warning(t("Confirmación requerida"), warnText)
      } else {
        setError(message)
        toast.error(t("Error al ingresar"), message)
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
          <p className="mt-2 text-gray-600">{t("Plataforma de tutorías universitarias")}</p>
        </div>

        {successMessage && (
          <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        <Card>
          <Card.Header>
            <h2 className="text-lg font-semibold text-gray-900">{t("Iniciar sesión")}</h2>
            <p className="mt-1 text-sm text-gray-500">
              {t("Ingresa con tu correo institucional")}
            </p>
          </Card.Header>

          <Card.Body>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label={t("Correo electrónico")}
                type="email"
                placeholder={t("usuario@universidad.edu")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <Input
                label={t("Contraseña")}
                type="password"
                placeholder={t("Tu contraseña")}
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
                {t("Ingresar")}
              </Button>
            </form>
          </Card.Body>

          <Card.Footer>
            <p className="text-center text-sm text-gray-500">
              {t("¿No tienes cuenta?")}{' '}
              <Link
                to="/register"
                className="font-medium text-primary-600 hover:text-primary-700"
              >
                {t("Regístrate aquí")}
              </Link>
            </p>
          </Card.Footer>
        </Card>
      </div>
    </div>
  )
}

