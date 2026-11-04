import { getErrorMessage } from '@/shared/utils/error'
import { useTranslations } from '@/i18n/useTranslations'
import { useState, useEffect, useRef, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GraduationCap, Lock, CheckCircle2, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Card } from '@/shared/components/ui/Card'
import { toast } from '@/shared/store/toast.store'
import { PasswordStrengthIndicator } from '@/shared/components/PasswordStrengthIndicator'
import { validatePassword } from '@/shared/utils/password'

const CONSUMED_STORAGE_KEY = 'unitutor_recovery_consumed_state'
const ACTIVE_STORAGE_KEY = 'unitutor_recovery_flow_active'

function checkIsRecoverySession(session: { access_token?: string; user?: unknown } | null): boolean {
  if (!session) return false
  const userAmr = (session.user as { amr?: Array<{ method: string }> })?.amr
  if (Array.isArray(userAmr) && userAmr.some((item) => item.method === 'recovery' || item.method === 'otp')) {
    return true
  }
  if (!session.access_token) return false
  try {
    const payload = session.access_token.split('.')[1]
    if (!payload) return false
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = JSON.parse(window.atob(base64))
    const amr = decoded?.amr
    if (Array.isArray(amr)) {
      return amr.some((item: { method?: string }) => item.method === 'recovery' || item.method === 'otp')
    }
  } catch {
    return false
  }
  return false
}

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

  const handleClearRecoveryFlow = () => {
    sessionStorage.removeItem(ACTIVE_STORAGE_KEY)
    sessionStorage.removeItem(CONSUMED_STORAGE_KEY)
  }

  useEffect(() => {
    if (sessionStorage.getItem(CONSUMED_STORAGE_KEY) === 'completed') {
      setHasValidSession(false)
      setSessionExpiryReason(
        t("Este enlace de recuperación ya ha sido utilizado para actualizar la contraseña.")
      )
      return
    }

    const rawHash = window.location.hash
    const rawSearch = window.location.search

    const urlParams = new URLSearchParams(rawSearch.startsWith('?') ? rawSearch.slice(1) : '')
    const hashParams = new URLSearchParams(rawHash.startsWith('#') ? rawHash.slice(1) : '')

    const errorCode = hashParams.get('error_code') || urlParams.get('error_code')
    const errorDescription = hashParams.get('error_description') || urlParams.get('error_description')

    if (errorCode || errorDescription) {
      sessionStorage.removeItem(ACTIVE_STORAGE_KEY)
      window.history.replaceState(null, '', window.location.pathname)
      setHasValidSession(false)
      setSessionExpiryReason(
        errorCode === 'otp_expired'
          ? t("El enlace de recuperación ha expirado. Por seguridad los enlaces vencen tras 15 minutos.")
          : t("El enlace de recuperación no es válido o ya fue utilizado anteriormente.")
      )
      return
    }

    const isRecoveryHash = hashParams.get('type') === 'recovery' || rawHash.includes('type=recovery')
    const isRecoverySearch = urlParams.get('type') === 'recovery' || rawSearch.includes('type=recovery')
    const hasCodeParam = Boolean(urlParams.get('code'))
    const isExplicitRecoveryArrival = isRecoveryHash || isRecoverySearch || hasCodeParam

    const expiresAt = hashParams.get('expires_at')
    if (expiresAt) {
      const expTimestamp = Number(expiresAt) * 1000
      if (!Number.isNaN(expTimestamp) && Date.now() > expTimestamp) {
        sessionStorage.removeItem(ACTIVE_STORAGE_KEY)
        window.history.replaceState(null, '', window.location.pathname)
        setHasValidSession(false)
        setSessionExpiryReason(
          t("El enlace de recuperación ha expirado. Por favor solicita uno nuevo.")
        )
        return
      }
    }

    if (isExplicitRecoveryArrival) {
      sessionStorage.setItem(ACTIVE_STORAGE_KEY, 'active')
    }

    const isAlreadyActiveFlow = sessionStorage.getItem(ACTIVE_STORAGE_KEY) === 'active'

    const checkSession = async () => {
      if (verifiedRef.current) return

      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        const issuedAt = (session as { expires_at?: number; expires_in?: number }).expires_at
          ? ((session as { expires_at?: number }).expires_at! - ((session as { expires_in?: number }).expires_in || 3600)) * 1000
          : null

        const isTooOld = issuedAt && Date.now() - issuedAt > 15 * 60 * 1000

        if (isTooOld) {
          sessionStorage.removeItem(ACTIVE_STORAGE_KEY)
          await supabase.auth.signOut().catch(() => {})
          setHasValidSession(false)
          setSessionExpiryReason(
            t("El enlace de recuperación ha superado el tiempo límite de validez (15 minutos).")
          )
          return
        }

        const isRecovery = isExplicitRecoveryArrival || isAlreadyActiveFlow || checkIsRecoverySession(session)

        if (isRecovery) {
          sessionStorage.setItem(ACTIVE_STORAGE_KEY, 'active')
          setHasValidSession(true)
          verifiedRef.current = true
          if (rawHash || rawSearch) {
            window.history.replaceState(null, '', window.location.pathname)
          }
        } else {
          setHasValidSession(false)
          setSessionExpiryReason(
            t("No se detectó un enlace de recuperación válido. Para cambiar tu contraseña ingresa desde tu perfil o solicita un enlace.")
          )
        }
      } else if (!isExplicitRecoveryArrival && !isAlreadyActiveFlow) {
        setHasValidSession(false)
      }
    }

    void checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        sessionStorage.setItem(ACTIVE_STORAGE_KEY, 'active')
        setHasValidSession(true)
        verifiedRef.current = true
        window.history.replaceState(null, '', window.location.pathname)
      } else if (session && (isExplicitRecoveryArrival || isAlreadyActiveFlow || checkIsRecoverySession(session))) {
        sessionStorage.setItem(ACTIVE_STORAGE_KEY, 'active')
        setHasValidSession(true)
        verifiedRef.current = true
        if (window.location.hash || window.location.search) {
          window.history.replaceState(null, '', window.location.pathname)
        }
      } else if (event === 'SIGNED_OUT') {
        if (!verifiedRef.current && sessionStorage.getItem(ACTIVE_STORAGE_KEY) !== 'active') {
          setHasValidSession(false)
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [t])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      toast.warning(
        t("Contraseña poco segura"),
        t("La contraseña debe cumplir con todos los requisitos de seguridad.")
      )
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

      try {
        await supabase.rpc('record_password_recovery_consumed')
      } catch {
      }

      sessionStorage.removeItem(ACTIVE_STORAGE_KEY)
      sessionStorage.setItem(CONSUMED_STORAGE_KEY, 'completed')

      try {
        await supabase.auth.signOut({ scope: 'global' })
      } catch {
        await supabase.auth.signOut().catch(() => {})
      }

      window.history.replaceState(null, '', window.location.pathname)
      setHasValidSession(false)
      setIsSuccess(true)

      toast.success(
        t("Contraseña actualizada"),
        t("Tu contraseña se ha restablecido correctamente. Inicia sesión con tus nuevas credenciales.")
      )
    } catch (err) {
      const message = getErrorMessage(err, t, "Error al actualizar la contraseña.")
      toast.error(t("Error"), message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoToLogin = () => {
    handleClearRecoveryFlow()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-900 font-bold mb-3">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold text-primary-900">UniTutor</h1>
          <p className="mt-2 text-gray-700 font-medium">{t("Establecer nueva contraseña")}</p>
        </div>

        <Card>
          <Card.Header>
            <h2 className="text-lg font-semibold text-gray-900">
              {isSuccess ? t("¡Contraseña restablecida!") : t("Crea tu nueva contraseña")}
            </h2>
            <p className="mt-1 text-sm text-gray-700 font-medium">
              {isSuccess
                ? t("Ya puedes ingresar con tus nuevas credenciales")
                : t("Ingresa y confirma tu nueva contraseña institucional")}
            </p>
          </Card.Header>

          <Card.Body>
            {isSuccess ? (
              <div className="space-y-4 text-center py-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300 font-bold">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {t("Tu contraseña ha sido actualizada exitosamente. Por motivos de seguridad, todas las sesiones anteriores han sido finalizadas.")}
                  </p>
                  <div className="inline-flex items-center gap-1.5 text-xs text-primary-950 bg-primary-100/80 px-3 py-1.5 rounded-full font-bold border border-primary-200">
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
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-800 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">
                        {t("Enlace expirado o no válido")}
                      </p>
                      <p className="text-xs text-amber-950 font-medium leading-relaxed">
                        {sessionExpiryReason ||
                          t("El enlace de recuperación es de un solo uso y caduca automáticamente a los 15 minutos por seguridad. Solicita un nuevo enlace para continuar.")}
                      </p>
                    </div>
                  </div>
                </div>
                <Link to="/forgot-password" className="block" onClick={handleClearRecoveryFlow}>
                  <Button variant="primary" fullWidth>
                    {t("Solicitar nuevo enlace")}
                  </Button>
                </Link>
              </div>
            ) : hasValidSession === null ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
                <p className="text-sm text-gray-700 font-medium">{t("Cargando...")}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-950 font-medium flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-800 shrink-0" />
                  <span>{t("Este enlace es de uso único y expirará inmediatamente tras guardar tu contraseña.")}</span>
                </div>

                <div className="space-y-1">
                  <Input
                    label={t("Nueva contraseña")}
                    type="password"
                    placeholder={t("Mínimo 8 caracteres")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <PasswordStrengthIndicator password={password} />
                </div>

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
                  onClick={handleClearRecoveryFlow}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-800 hover:text-primary-950"
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
