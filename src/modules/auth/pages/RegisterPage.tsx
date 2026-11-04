import { getErrorMessage } from '@/shared/utils/error'
import { useTranslations } from '@/i18n/useTranslations'
import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap, UserCheck, Mail, CheckCircle2, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Card } from '@/shared/components/ui/Card'
import { toast } from '@/shared/store/toast.store'
import type { Institution } from '@/types/database.types'
import { PasswordStrengthIndicator } from '@/shared/components/PasswordStrengthIndicator'
import { validatePassword } from '@/shared/utils/password'

export function RegisterPage() {
  const { t } = useTranslations()

  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    institutionId: '',
    role: 'estudiante' as 'estudiante' | 'tutor',
  })
  const [loadingInstitutions, setLoadingInstitutions] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    const loadInstitutions = async () => {
      const { data } = await supabase
        .from('institutions')
        .select('*')
        .eq('active', true)
        .order('name')

      setInstitutions(data ?? [])
      setLoadingInstitutions(false)
    }
    void loadInstitutions()
  }, [])

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!form.institutionId) {
      toast.warning(t("Institución requerida"), t("Por favor selecciona tu institución educativa."))
      return
    }

    const passwordValidation = validatePassword(form.password)
    if (!passwordValidation.isValid) {
      toast.warning(
        t("Contraseña poco segura"),
        t("La contraseña debe cumplir con todos los requisitos de seguridad.")
      )
      return
    }

    if (form.password !== form.confirmPassword) {
      toast.warning(t("Las contraseñas no coinciden"), t("Verifica que ambas contraseñas sean iguales."))
      return
    }

    setIsSubmitting(true)
    try {
      const cleanEmail = form.email.trim().toLowerCase()
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: form.password,
        options: {
          data: {
            first_name: form.firstName.trim(),
            last_name: form.lastName.trim(),
            institution_id: form.institutionId,
            role: form.role,
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      })

      if (error) throw error

      if (data.user) {
        setIsRegistered(true)
        toast.success(
          t("¡Registro exitoso!"),
          t("Hemos enviado un correo de confirmación a tu dirección institucional.")
        )
      }
    } catch (err) {
      const message = getErrorMessage(err, t, "Error al registrar usuario.")
      const raw = err instanceof Error ? err.message : ''
      if (raw.toLowerCase().includes('already registered')) {
        toast.error(t("Correo ya registrado"), message)
      } else {
        toast.error(t("Error de registro"), message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResendConfirmation = async () => {
    if (!form.email.trim()) return
    setIsResending(true)
    try {
      const cleanEmail = form.email.trim().toLowerCase()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      })
      if (error) throw error
      toast.success(
        t("Correo reenviado"),
        t("Se ha enviado un nuevo enlace de confirmación a tu correo.")
      )
    } catch (err) {
      const message = getErrorMessage(err, t, "Error al reenviar correo.")
      toast.error(t("Error"), message)
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="w-full max-w-xl my-auto">
      <div className="mb-3 text-center flex flex-col items-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-100 text-primary-900 font-bold mb-1.5">
          <GraduationCap className="h-5 w-5" />
        </div>
        <h1 className="text-xl font-bold text-primary-900">UniTutor</h1>
        <p className="mt-0.5 text-xs text-gray-700 font-medium">{t("Crea tu cuenta institucional")}</p>
      </div>

        <Card>
          <Card.Header>
            <h2 className="text-lg font-semibold text-gray-900">
              {isRegistered ? t("¡Verifica tu correo electrónico!") : t("Registro de Usuario")}
            </h2>
            <p className="mt-1 text-sm text-gray-700 font-medium">
              {isRegistered
                ? t("Te enviamos un enlace de activación de cuenta")
                : t("Completa los datos para habilitar tu perfil académico")}
            </p>
          </Card.Header>

          <Card.Body>
            {isRegistered ? (
              <div className="space-y-4 text-center py-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300 font-bold">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-700">
                    {t("Hemos enviado un correo de confirmación a:")}
                  </p>
                  <p className="font-semibold text-gray-900 bg-gray-50 py-2 px-3 rounded-lg border border-gray-200 break-all text-sm">
                    {form.email}
                  </p>
                  <p className="text-xs text-gray-700 font-medium leading-relaxed pt-2">
                    {t("Abre tu correo institucional y haz clic en el enlace para activar tu cuenta antes de iniciar sesión. Si no lo recibes en unos minutos, revisa tu carpeta de spam o correo no deseado.")}
                  </p>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <Link to="/login" className="block">
                    <Button variant="primary" fullWidth>
                      {t("Ir a iniciar sesión")}
                    </Button>
                  </Link>

                  <Button
                    variant="ghost"
                    size="sm"
                    fullWidth
                    onClick={handleResendConfirmation}
                    isLoading={isResending}
                    className="text-gray-700 hover:text-gray-950 text-xs font-semibold"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    {t("¿No recibiste el correo? Reenviar enlace")}
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    {t('Deseo registrarme como:')} <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, role: 'estudiante' }))}
                      className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 px-3 text-sm font-medium transition-all cursor-pointer ${
                        form.role === 'estudiante'
                          ? 'border-primary-800 bg-primary-100 text-primary-950 ring-2 ring-primary-700/20 font-bold'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100 font-semibold'
                      }`}
                    >
                      <GraduationCap className="h-4 w-4" />
                      {t("Estudiante")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, role: 'tutor' }))}
                      className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 px-3 text-sm font-medium transition-all cursor-pointer ${
                        form.role === 'tutor'
                          ? 'border-primary-800 bg-primary-100 text-primary-950 ring-2 ring-primary-700/20 font-bold'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100 font-semibold'
                      }`}
                    >
                      <UserCheck className="h-4 w-4" />
                      {t("Tutor")}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label={t("Nombre")}
                    name="firstName"
                    placeholder="Juan"
                    value={form.firstName}
                    onChange={handleChange}
                    required
                    autoComplete="given-name"
                  />
                  <Input
                    label={t("Apellido")}
                    name="lastName"
                    placeholder="Pérez"
                    value={form.lastName}
                    onChange={handleChange}
                    required
                    autoComplete="family-name"
                  />
                </div>

                <Input
                  label={t("Correo electrónico")}
                  name="email"
                  type="email"
                  placeholder={t("usuario@universidad.edu")}
                  value={form.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                />

                <div className="flex flex-col gap-1">
                  <label htmlFor="institutionId" className="text-sm font-medium text-gray-700">
                    {t("Institución")} <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="institutionId"
                    name="institutionId"
                    value={form.institutionId}
                    onChange={handleChange}
                    disabled={loadingInstitutions}
                    required
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-500 disabled:cursor-not-allowed disabled:bg-gray-50"
                  >
                    <option value="">
                      {loadingInstitutions ? t("Cargando...") : t("-- Selecciona tu institución --")}
                    </option>
                    {institutions.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name}
                      </option>
                    ))}
                  </select>
                  {institutions.length === 0 && !loadingInstitutions && (
                    <p className="text-xs text-amber-600">
                      {t("No hay instituciones disponibles. Contacta al administrador.")}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <Input
                    label={t("Contraseña")}
                    name="password"
                    type="password"
                    placeholder={t("Mínimo 8 caracteres")}
                    value={form.password}
                    onChange={handleChange}
                    required
                    autoComplete="new-password"
                  />
                  <Input
                    label={t("Confirmar contraseña")}
                    name="confirmPassword"
                    type="password"
                    placeholder={t("Repite tu contraseña")}
                    value={form.confirmPassword}
                    onChange={handleChange}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <PasswordStrengthIndicator password={form.password} />

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  isLoading={isSubmitting}
                  className="mt-2"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {t("Registrarme y verificar correo")}
                </Button>
              </form>
            )}
          </Card.Body>

          {!isRegistered && (
            <Card.Footer>
              <p className="text-center text-sm text-gray-700 font-medium">
                {t("¿Ya tienes cuenta?")}{' '}
                <Link to="/login" className="font-semibold text-primary-800 hover:text-primary-950">
                  {t("Inicia sesión")}
                </Link>
              </p>
            </Card.Footer>
          )}
        </Card>
      </div>
  )
}
