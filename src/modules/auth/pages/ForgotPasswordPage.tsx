import { useTranslations } from '@/i18n/useTranslations'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Card } from '@/shared/components/ui/Card'
import { toast } from '@/shared/store/toast.store'

export function ForgotPasswordPage() {
  const { t } = useTranslations()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setIsLoading(true)
    try {
      const cleanEmail = email.trim().toLowerCase()
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error

      setIsSubmitted(true)
      toast.success(
        t("Enlace enviado"),
        t("Hemos enviado las instrucciones para restablecer tu contraseña.")
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : t("Error al enviar enlace de recuperación.")
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
          <p className="mt-2 text-gray-600">{t("Recuperación de contraseña")}</p>
        </div>

        <Card>
          <Card.Header>
            <h2 className="text-lg font-semibold text-gray-900">
              {isSubmitted ? t("Revisa tu correo") : t("¿Olvidaste tu contraseña?")}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {isSubmitted
                ? t("Te enviamos un enlace de restablecimiento seguro")
                : t("Ingresa tu correo institucional para recibir un enlace de recuperación")}
            </p>
          </Card.Header>

          <Card.Body>
            {isSubmitted ? (
              <div className="space-y-4 text-center py-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-700">
                    {t("Hemos enviado un correo a:")}
                  </p>
                  <p className="font-semibold text-gray-900 bg-gray-50 py-2 px-3 rounded-lg border border-gray-200 break-all text-sm">
                    {email}
                  </p>
                  <p className="text-xs text-gray-500 leading-relaxed pt-2">
                    {t("Haz clic en el enlace del mensaje para establecer una nueva contraseña. Si no lo encuentras en unos minutos, revisa tu carpeta de spam o correo no deseado.")}
                  </p>
                </div>
                <div className="pt-2">
                  <Link to="/login" className="block">
                    <Button variant="secondary" fullWidth>
                      {t("Volver a iniciar sesión")}
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
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

                <Button type="submit" fullWidth isLoading={isLoading}>
                  <Mail className="h-4 w-4 mr-2" />
                  {t("Enviar enlace de recuperación")}
                </Button>
              </form>
            )}
          </Card.Body>

          {!isSubmitted && (
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
