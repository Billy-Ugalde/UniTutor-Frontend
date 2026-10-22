import { useTranslations } from '@/i18n/useTranslations'
import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GraduationCap, Lock, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Card } from '@/shared/components/ui/Card'
import { toast } from '@/shared/store/toast.store'

export function ResetPasswordPage() {
  const { t } = useTranslations()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [hasValidSession, setHasValidSession] = useState<boolean | null>(null)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setHasValidSession(Boolean(session))
    }

    void checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || Boolean(session)) {
        setHasValidSession(true)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (password.length < 8) {
      toast.warning(t("Contraseña demasiado corta"), t("La contraseña debe tener al menos 8 caracteres."))
      return
    }

    if (password !== confirmPassword) {
      toast.warning(t("Las contraseñas no coinciden"), t("Verifica que ambas contraseñas sean iguales."))
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) throw error

      setIsSuccess(true)
      toast.success(
        t("Contraseña actualizada"),
        t("Tu contraseña se ha restablecido correctamente.")
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : t("Error al actualizar la contraseña.")
      toast.error(t("Error"), message)
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
          <p className="mt-2 text-gray-600">{t("Establecer nueva contraseña")}</p>
        </div>

        <Card>
          <Card.Header>
            <h2 className="text-lg font-semibold text-gray-900">
              {isSuccess ? t("¡Contraseña restablecida!") : t("Crea tu nueva contraseña")}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {isSuccess
                ? t("Ya puedes ingresar con tus nuevas credenciales")
                : t("Ingresa y confirma tu nueva contraseña institucional")}
            </p>
          </Card.Header>

          <Card.Body>
            {isSuccess ? (
              <div className="space-y-4 text-center py-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {t("Tu contraseña ha sido actualizada exitosamente. Puedes continuar al inicio de sesión o acceder a tu cuenta.")}
                </p>
                <div className="pt-2">
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() => navigate('/login')}
                  >
                    {t("Ir a iniciar sesión")}
                  </Button>
                </div>
              </div>
            ) : hasValidSession === false ? (
              <div className="space-y-4 py-2">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">
                        {t("Enlace expirado o no válido")}
                      </p>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        {t("El enlace de recuperación es de un solo uso o ha caducado. Solicita un nuevo enlace para restablecer tu contraseña.")}
                      </p>
                    </div>
                  </div>
                </div>
                <Link to="/forgot-password" className="block">
                  <Button variant="primary" fullWidth>
                    {t("Solicitar nuevo enlace")}
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input
                  label={t("Nueva contraseña")}
                  type="password"
                  placeholder={t("Mínimo 8 caracteres")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />

                <Input
                  label={t("Confirmar nueva contraseña")}
                  type="password"
                  placeholder={t("Repite tu nueva contraseña")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />

                <Button type="submit" fullWidth isLoading={isLoading}>
                  <Lock className="h-4 w-4 mr-2" />
                  {t("Actualizar contraseña")}
                </Button>
              </form>
            )}
          </Card.Body>

          {!isSuccess && (
            <Card.Footer>
              <div className="text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t("Volver a iniciar sesión")}
                </Link>
              </div>
            </Card.Footer>
          )}
        </Card>
      </div>
    </div>
  )
}
