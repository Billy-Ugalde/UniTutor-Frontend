import { useTranslations } from '@/i18n/useTranslations'
import { useState, useEffect, useRef, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GraduationCap, Lock, CheckCircle2, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Card } from '@/shared/components/ui/Card'
import { toast } from '@/shared/store/toast.store'

// Clave en sessionStorage para marcar tokens consumidos y evitar su reutilización en el navegador
const CONSUMED_STORAGE_KEY = 'unitutor_recovery_consumed_state'

export function ResetPasswordPage() {
  const { t } = useTranslations()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [hasValidSession, setHasValidSession] = useState<boolean | null>(null)
  const [sessionExpiryReason, setSessionExpiryReason] = useState<string | null>(null)

  const verifiedRef = useRef(false)

  useEffect(() => {
    // Si ya completamos el restablecimiento con éxito en esta ventana, impedir reuso
    if (sessionStorage.getItem(CONSUMED_STORAGE_KEY) === 'completed') {
      setHasValidSession(false)
      setSessionExpiryReason(
        t("Este enlace de recuperación ya ha sido utilizado para actualizar la contraseña.")
      )
      return
    }

    const rawHash = window.location.hash
    const rawSearch = window.location.search

    // 1. Detectar errores reportados por Supabase en los parámetros (ej. otp_expired o enlace inválido)
    const urlParams = new URLSearchParams(
      rawSearch.startsWith('?') ? rawSearch.slice(1) : ''
    )
    const hashParams = new URLSearchParams(
      rawHash.startsWith('#') ? rawHash.slice(1) : ''
    )

    const errorCode = hashParams.get('error_code') || urlParams.get('error_code')
    const errorDescription = hashParams.get('error_description') || urlParams.get('error_description')

    if (errorCode || errorDescription) {
      // Limpiar URL de inmediato para evitar persistencia de parámetros en historial/headers
      window.history.replaceState(null, '', window.location.pathname)
      setHasValidSession(false)
      setSessionExpiryReason(
        errorCode === 'otp_expired'
          ? t("El enlace de recuperación ha expirado. Por seguridad los enlaces vencen tras 15 minutos.")
          : t("El enlace de recuperación no es válido o ya fue utilizado anteriormente.")
      )
      return
    }

    // 2. Comprobar si el origen de la navegación es un enlace explícito de recuperación
    const isRecoveryHash = hashParams.get('type') === 'recovery' || rawHash.includes('type=recovery')
    const isRecoverySearch = urlParams.get('type') === 'recovery' || rawSearch.includes('type=recovery')
    const hasCodeParam = Boolean(urlParams.get('code'))
    const isExplicitRecoveryArrival = isRecoveryHash || isRecoverySearch || hasCodeParam

    // 3. Validar expiración si viene expires_at en el hash (tiempo de expiración UNIX en segundos)
    const expiresAt = hashParams.get('expires_at')
    if (expiresAt) {
      const expTimestamp = Number(expiresAt) * 1000
      if (!Number.isNaN(expTimestamp) && Date.now() > expTimestamp) {
        window.history.replaceState(null, '', window.location.pathname)
        setHasValidSession(false)
        setSessionExpiryReason(
          t("El enlace de recuperación ha expirado. Por favor solicita uno nuevo.")
        )
        return
      }
    }

    // 4. Limpiar los fragmentos sensibles de la barra de direcciones de inmediato para evitar fugas en historial y referers
    if (rawHash || rawSearch) {
      window.history.replaceState(null, '', window.location.pathname)
    }

    let recoveryValidated = false

    const checkSession = async () => {
      if (verifiedRef.current) return

      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        // En Supabase, verificar si la sesión contiene el método 'recovery' o proviene de un flujo explícito
        const amr = (session.user as { amr?: Array<{ method: string; timestamp?: number }> })?.amr
        const isRecoveryAmr = Array.isArray(amr) && amr.some((item) => item.method === 'recovery' || item.method === 'otp')

        // Validar antigüedad de emisión (máximo 15 minutos = 900 segundos)
        const issuedAt = (session as { expires_at?: number; expires_in?: number }).expires_at
          ? ((session as { expires_at?: number }).expires_at! - ((session as { expires_in?: number }).expires_in || 3600)) * 1000
          : null

        const isTooOld = issuedAt && Date.now() - issuedAt > 15 * 60 * 1000

        if (isTooOld) {
          await supabase.auth.signOut().catch(() => {})
          setHasValidSession(false)
          setSessionExpiryReason(
            t("El enlace de recuperación ha superado el tiempo límite de validez (15 minutos).")
          )
          return
        }

        if (isExplicitRecoveryArrival || isRecoveryAmr || recoveryValidated) {
          setHasValidSession(true)
          verifiedRef.current = true
        } else {
          // Si el usuario simplemente navegó a /reset-password con una sesión ordinaria previa
          setHasValidSession(false)
          setSessionExpiryReason(
            t("No se detectó un enlace de recuperación válido. Para cambiar tu contraseña ingresa desde tu perfil o solicita un enlace.")
          )
        }
      } else if (!isExplicitRecoveryArrival) {
        setHasValidSession(false)
      }
    }

    void checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        recoveryValidated = true
        setHasValidSession(true)
        verifiedRef.current = true
        window.history.replaceState(null, '', window.location.pathname)
      } else if (event === 'SIGNED_OUT') {
        setHasValidSession(false)
      } else if (session && isExplicitRecoveryArrival) {
        recoveryValidated = true
        setHasValidSession(true)
        verifiedRef.current = true
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [t])

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
      // 1. Actualizar la contraseña del usuario
      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) throw error

      // 2. Registrar en auditoría el consumo del enlace de recuperación
      try {
        await supabase.rpc('record_password_recovery_consumed')
      } catch {
        // Fallback silencioso si la migración de auditoría aún no se ha ejecutado
      }

      // 3. Marcar de inmediato en sessionStorage que este enlace ya se consumió (un solo uso)
      sessionStorage.setItem(CONSUMED_STORAGE_KEY, 'completed')

      // 4. Invalidar de inmediato todas las sesiones activas en el servidor y cerrar sesión localmente
      try {
        await supabase.auth.signOut({ scope: 'global' })
      } catch {
        await supabase.auth.signOut().catch(() => {})
      }

      // 5. Limpiar URL e invalidar estado de sesión del formulario
      window.history.replaceState(null, '', window.location.pathname)
      setHasValidSession(false)
      setIsSuccess(true)

      toast.success(
        t("Contraseña actualizada"),
        t("Tu contraseña se ha restablecido correctamente. Inicia sesión con tus nuevas credenciales.")
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : t("Error al actualizar la contraseña.")
      toast.error(t("Error"), message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoToLogin = () => {
    sessionStorage.removeItem(CONSUMED_STORAGE_KEY)
    navigate('/login')
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
                <div className="space-y-2">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {t("Tu contraseña ha sido actualizada exitosamente. Por motivos de seguridad, todas las sesiones anteriores han sido finalizadas.")}
                  </p>
                  <div className="inline-flex items-center gap-1.5 text-xs text-primary-700 bg-primary-50 px-3 py-1.5 rounded-full font-medium">
                    <ShieldCheck className="h-4 w-4" />
                    {t("Enlace invalidado y protegido")}
                  </div>
                </div>
                <div className="pt-2">
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={handleGoToLogin}
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
                        {sessionExpiryReason ||
                          t("El enlace de recuperación es de un solo uso y caduca automáticamente a los 15 minutos por seguridad. Solicita un nuevo enlace para continuar.")}
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
                <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
                  <span>{t("Este enlace es de uso único y expirará inmediatamente tras guardar tu contraseña.")}</span>
                </div>

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
