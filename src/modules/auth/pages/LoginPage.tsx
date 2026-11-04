import { getErrorMessage } from '@/shared/utils/error'
import { useTranslations } from '@/i18n/useTranslations'
import { useState, useEffect, useRef, type FormEvent } from 'react'
import type { TranslationKey } from '@/i18n/core'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { GraduationCap, RefreshCw } from 'lucide-react'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Card } from '@/shared/components/ui/Card'
import { toast } from '@/shared/store/toast.store'

export function LoginPage() {
  const { t } = useTranslations()
  const { signIn, isAuthenticated, isLoading: isAuthLoading } = useAuth()
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
  const [showResendConfirmation, setShowResendConfirmation] = useState(false)
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    const isRecovery =
      location.hash.includes('type=recovery') ||
      location.search.includes('type=recovery') ||
      location.search.includes('code=') ||
      location.hash.includes('otp_expired') ||
      location.search.includes('otp_expired')

    if (isRecovery) {
      navigate('/reset-password' + location.search + location.hash, { replace: true })
      return
    }


    if (isAuthenticated && !isAuthLoading) {
      if (location.hash.includes('type=signup')) {
        toast.success(
          t("¡Cuenta verificada!"),
          t("Tu correo ha sido confirmado exitosamente. Bienvenido a UniTutor.")
        )
      }
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, isAuthLoading, location.hash, navigate, t])

  useEffect(() => {
    if (successMessage && notifiedRegistration.current !== location.key) {
      notifiedRegistration.current = location.key
      toast.success(t("¡Registro completado!"), successMessage)
    }
  }, [successMessage, location.key, t])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setShowResendConfirmation(false)
    setIsLoading(true)

    try {
      await signIn(email, password)
      toast.success(t("¡Bienvenido a UniTutor!"), t("Has iniciado sesión correctamente."))
      navigate('/dashboard')
    } catch (err) {
      const errorText = getErrorMessage(err, t, "Error al iniciar sesión.")
      const raw = err instanceof Error ? err.message : ''
      if (raw.toLowerCase().includes('desactivada')) {
        setError(errorText)
        toast.error(t("Acceso denegado"), errorText, 6000)
      } else if (raw.toLowerCase().includes('email not confirmed')) {
        setError(errorText)
        setShowResendConfirmation(true)
        toast.warning(t("Confirmación requerida"), errorText)
      } else if (raw.toLowerCase().includes('invalid login credentials')) {
        setError(errorText)
        toast.error(t("Credenciales incorrectas"), errorText)
      } else {
        setError(errorText)
        toast.error(t("Error al ingresar"), errorText)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    if (!email.trim()) return
    setIsResending(true)
    try {
      const cleanEmail = email.trim().toLowerCase()
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      })
      if (resendError) throw resendError
      toast.success(
        t("Correo reenviado"),
        t("Hemos enviado un nuevo enlace de activación a tu correo.")
      )
    } catch (err) {
      const msg = getErrorMessage(err, t, "Error al reenviar correo.")
      toast.error(t("Error"), msg)
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-900 font-bold mb-3">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold text-primary-900">UniTutor</h1>
          <p className="mt-2 text-gray-700 font-medium">{t("Plataforma de tutorías universitarias")}</p>
        </div>

        {successMessage && (
          <div className="mb-4 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 font-bold">
            {successMessage}
          </div>
        )}

        <Card>
          <Card.Header>
            <h2 className="text-lg font-semibold text-gray-900">{t("Iniciar sesión")}</h2>
            <p className="mt-1 text-sm text-gray-700 font-medium">
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

              <div className="flex flex-col gap-1">
                <Input
                  label={t("Contraseña")}
                  type="password"
                  placeholder={t("Tu contraseña")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <div className="flex justify-end pt-1">
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-primary-800 hover:text-primary-950 cursor-pointer"
                  >
                    {t("¿Olvidaste tu contraseña?")}
                  </Link>
                </div>
              </div>

              {error && (
                <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-950 font-medium space-y-2.5">
                  <p>{error}</p>
                  {showResendConfirmation && (
                    <div className="pt-1 border-t border-red-200 flex flex-col gap-2">
                      <p className="text-xs text-red-950 font-medium">
                        {t("Por favor revisa tu bandeja de entrada o spam. Si no lo has recibido, solicita un nuevo enlace:")}
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleResendConfirmation}
                        isLoading={isResending}
                        className="self-start text-xs font-semibold"
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                        {t("Reenviar correo de activación")}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <Button type="submit" fullWidth isLoading={isLoading}>
                {t("Ingresar")}
              </Button>
            </form>
          </Card.Body>

          <Card.Footer>
            <p className="text-center text-sm text-gray-700 font-medium">
              {t("¿No tienes cuenta?")}{' '}
              <Link
                to="/register"
                className="font-semibold text-primary-800 hover:text-primary-950"
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
