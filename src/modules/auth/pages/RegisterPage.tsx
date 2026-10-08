import { useTranslations } from '@/i18n/useTranslations'
import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap, UserCheck, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Card } from '@/shared/components/ui/Card'
import { toast } from '@/shared/store/toast.store'
import type { Institution } from '@/types/database.types'

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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    toast.info(
      t("Próximamente"),
      t("El registro público de usuarios se implementará próximamente. Por favor contacta al administrador de tu institución.")
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-700 mb-3">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold text-primary-700">UniTutor</h1>
          <p className="mt-2 text-gray-600">{t("Crea tu cuenta institucional")}</p>
        </div>

        <Card>
          <Card.Header>
            <h2 className="text-lg font-semibold text-gray-900">{t("Registro de Usuario")}</h2>
            <p className="mt-1 text-sm text-gray-500">
              {t("Los campos marcados con")} <span className="text-red-500">*</span> {t("son obligatorios")}
            </p>
          </Card.Header>

          <Card.Body>
            <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    {t("Registro público no disponible")}
                  </p>
                  <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                    {t("Próximamente se implementará el autoregistro para estudiantes y tutores. Actualmente, la asignación de cuentas es gestionada directamente por los administradores de cada institución.")}
                  </p>
                </div>
              </div>
            </div>

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
                        ? 'border-primary-600 bg-primary-50 text-primary-700 ring-2 ring-primary-500/20 font-semibold'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
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
                        ? 'border-primary-600 bg-primary-50 text-primary-700 ring-2 ring-primary-500/20 font-semibold'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
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

              <Button
                type="submit"
                variant="secondary"
                fullWidth
                disabled
                className="cursor-not-allowed opacity-75 mt-2"
              >
                {t("Registro próximamente disponible")}
              </Button>
            </form>
          </Card.Body>

          <Card.Footer>
            <p className="text-center text-sm text-gray-500">
              {t("¿Ya tienes cuenta?")}{' '}
              <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700">
                {t("Inicia sesión")}
              </Link>
            </p>
          </Card.Footer>
        </Card>
      </div>
    </div>
  )
}
