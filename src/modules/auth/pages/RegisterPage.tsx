import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GraduationCap, UserCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Card } from '@/shared/components/ui/Card'
import { toast } from '@/shared/store/toast.store'
import type { Institution } from '@/types/database.types'

export function RegisterPage() {
  const navigate = useNavigate()

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
  const [errors, setErrors] = useState<Partial<typeof form>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
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
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const validate = (): boolean => {
    const newErrors: Partial<typeof form> = {}
    if (!form.firstName.trim()) newErrors.firstName = 'El nombre es requerido.'
    if (!form.lastName.trim()) newErrors.lastName = 'El apellido es requerido.'
    if (!form.email.trim()) newErrors.email = 'El correo es requerido.'
    if (!form.institutionId) newErrors.institutionId = 'Selecciona una institución.'
    if (form.password.length < 8)
      newErrors.password = 'Mínimo 8 caracteres.'
    if (form.password !== form.confirmPassword)
      newErrors.confirmPassword = 'Las contraseñas no coinciden.'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setServerError(null)
    if (!validate()) return
    setIsLoading(true)

    try {
      const { error: registerError } = await supabase.rpc('register_user', {
        p_email: form.email.trim(),
        p_password: form.password,
        p_first_name: form.firstName.trim(),
        p_last_name: form.lastName.trim(),
        p_institution_id: form.institutionId,
        p_role: form.role,
      })

      if (registerError) throw registerError

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password,
      })

      if (!signInError) {
        toast.success('¡Cuenta creada exitosamente!', 'Bienvenido a UniTutor.')
        navigate('/dashboard')
      } else {
        toast.success('¡Registro completado!', 'Ya puedes iniciar sesión con tus credenciales.')
        navigate('/login', {
          state: { message: '¡Cuenta creada exitosamente! Ya puedes iniciar sesión con tus credenciales.' },
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear la cuenta.'
      if (message.includes('Ya existe una cuenta') || message.includes('already registered')) {
        const errorText = 'Ya existe una cuenta con ese correo electrónico.'
        setServerError(errorText)
        toast.error('Correo ya registrado', errorText)
      } else {
        setServerError(message)
        toast.error('Error al registrarse', message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-700 mb-3">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold text-primary-700">UniTutor</h1>
          <p className="mt-2 text-gray-600">Crea tu cuenta institucional</p>
        </div>

        <Card>
          <Card.Header>
            <h2 className="text-lg font-semibold text-gray-900">Registro de Usuario</h2>
            <p className="mt-1 text-sm text-gray-500">
              Los campos marcados con <span className="text-red-500">*</span> son obligatorios
            </p>
          </Card.Header>

          <Card.Body>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Deseo registrarme como: <span className="text-red-500">*</span>
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
                    Estudiante
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
                    Tutor
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Nombre"
                  name="firstName"
                  placeholder="Juan"
                  value={form.firstName}
                  onChange={handleChange}
                  error={errors.firstName}
                  required
                  autoComplete="given-name"
                />
                <Input
                  label="Apellido"
                  name="lastName"
                  placeholder="Pérez"
                  value={form.lastName}
                  onChange={handleChange}
                  error={errors.lastName}
                  required
                  autoComplete="family-name"
                />
              </div>

              <Input
                label="Correo electrónico"
                name="email"
                type="email"
                placeholder="usuario@universidad.edu"
                value={form.email}
                onChange={handleChange}
                error={errors.email}
                required
                autoComplete="email"
              />

              <div className="flex flex-col gap-1">
                <label htmlFor="institutionId" className="text-sm font-medium text-gray-700">
                  Institución <span className="text-red-500">*</span>
                </label>
                <select
                  id="institutionId"
                  name="institutionId"
                  value={form.institutionId}
                  onChange={handleChange}
                  disabled={loadingInstitutions}
                  className={[
                    'rounded-md border px-3 py-2 text-sm text-gray-900',
                    'focus:outline-none focus:ring-2 focus:ring-primary-300',
                    errors.institutionId
                      ? 'border-red-400 focus:border-red-400'
                      : 'border-gray-300 focus:border-primary-500',
                    'disabled:cursor-not-allowed disabled:bg-gray-50',
                  ].join(' ')}
                >
                  <option value="">
                    {loadingInstitutions ? 'Cargando...' : '-- Selecciona tu institución --'}
                  </option>
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name}
                    </option>
                  ))}
                </select>
                {errors.institutionId && (
                  <p className="text-xs text-red-600">{errors.institutionId}</p>
                )}
                {institutions.length === 0 && !loadingInstitutions && (
                  <p className="text-xs text-amber-600">
                    No hay instituciones disponibles. Contacta al administrador.
                  </p>
                )}
              </div>

              <Input
                label="Contraseña"
                name="password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={form.password}
                onChange={handleChange}
                error={errors.password}
                required
                autoComplete="new-password"
              />

              <Input
                label="Confirmar contraseña"
                name="confirmPassword"
                type="password"
                placeholder="Repite tu contraseña"
                value={form.confirmPassword}
                onChange={handleChange}
                error={errors.confirmPassword}
                required
                autoComplete="new-password"
              />

              {serverError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {serverError}
                </div>
              )}

              <Button type="submit" variant="success" fullWidth isLoading={isLoading}>
                Crear cuenta
              </Button>
            </form>
          </Card.Body>

          <Card.Footer>
            <p className="text-center text-sm text-gray-500">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700">
                Inicia sesión
              </Link>
            </p>
          </Card.Footer>
        </Card>
      </div>
    </div>
  )
}
