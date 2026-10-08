import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  GraduationCap,
  BookOpen,
  Users,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Clock,
  Star,
  Menu,
  X,
  School,
  ArrowUp,
} from 'lucide-react'
import { useTranslations } from '@/i18n/useTranslations'
import { useAuthStore } from '@/modules/auth/store/auth.store'
import { LanguageSelector } from '@/shared/components/LanguageSelector'

export function LandingPage() {
  const { t } = useTranslations()
  const user = useAuthStore((s) => s.user)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-white text-gray-800 selection:bg-primary-500 selection:text-white" id="top">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-lg">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm shadow-primary-500/30">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-primary-950">UniTutor</span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#que-es"
              className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors"
            >
              {t("¿Qué es?")}
            </a>
            <a
              href="#beneficios"
              className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors"
            >
              {t("Beneficios")}
            </a>
            <a
              href="#comunidad"
              className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors"
            >
              {t("Comunidad")}
            </a>
            <a
              href="#como-funciona"
              className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors"
            >
              {t("¿Cómo funciona?")}
            </a>
          </nav>

          {/* Right actions: Language and Auth */}
          <div className="hidden sm:flex items-center gap-3">
            <LanguageSelector />

            {user ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                {t("Ir al Panel")}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="rounded-lg px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {t("Iniciar sesión")}
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-primary-500/20 transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  {t("Registrarse")}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu trigger */}
          <div className="flex items-center gap-2 sm:hidden">
            <LanguageSelector />
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label={mobileMenuOpen ? t("Cerrar menú de navegación") : t("Abrir menú de navegación")}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-gray-100 bg-white px-4 py-4 sm:hidden">
            <nav className="flex flex-col gap-3">
              <a
                href="#que-es"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
              >
                {t("¿Qué es?")}
              </a>
              <a
                href="#beneficios"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
              >
                {t("Beneficios")}
              </a>
              <a
                href="#comunidad"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
              >
                {t("Comunidad")}
              </a>
              <a
                href="#como-funciona"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
              >
                {t("¿Cómo funciona?")}
              </a>
            </nav>

            <div className="mt-4 border-t border-gray-100 pt-4 flex flex-col gap-2">
              {user ? (
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2.5 text-base font-medium text-white shadow-sm"
                >
                  {t("Ir al Panel")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2.5 text-base font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {t("Iniciar sesión")}
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2.5 text-base font-medium text-white shadow-sm hover:bg-primary-700"
                  >
                    {t("Registrarse")}
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-50/70 via-white to-white py-16 sm:py-24 lg:py-28" id="que-es">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
            {/* Left Column: Headlines & Call to Actions */}
            <div className="text-center lg:col-span-7 lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3.5 py-1 text-xs font-semibold text-primary-700 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-primary-600" />
                <span>{t("Acompañamiento Académico Universitario")}</span>
              </div>

              {/* Main Heading */}
              <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl leading-tight">
                {t("Potencia tu aprendizaje universitario con tutorías a tu medida")}
              </h1>

              {/* Description */}
              <p className="mt-5 text-lg text-gray-600 sm:text-xl sm:leading-relaxed max-w-2xl mx-auto lg:mx-0">
                {t("UniTutor conecta estudiantes con tutores universitarios y sus instituciones, facilitando resolver dudas, reforzar conocimientos y aprobar materias en un entorno colaborativo.")}
              </p>

              {/* CTA Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link
                  to={user ? "/dashboard" : "/register"}
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-primary-600 px-6 py-3.5 text-base font-semibold text-white shadow-md shadow-primary-500/25 transition-all hover:bg-primary-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  {t("Comenzar ahora")}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <a
                  href="#como-funciona"
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-3.5 text-base font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  {t("Ver cómo funciona")}
                </a>
              </div>

              {/* Trust Indicators */}
              <div className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>{t("Tutores universitarios")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>{t("Materias aprobadas")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>{t("Respaldo institucional")}</span>
                </div>
              </div>
            </div>

            {/* Right Column: Visual Mockup Card */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-md">
                {/* Decorative glow */}
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary-400 to-primary-600 opacity-20 blur-xl"></div>

                <div className="relative rounded-2xl border border-primary-100 bg-white p-6 shadow-xl shadow-primary-900/5">
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-primary-700">
                        {t("Próxima sesión de tutoría")}
                      </span>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 border border-green-200">
                      <ShieldCheck className="mr-1 h-3 w-3" />
                      {t("Verificado por la institución")}
                    </span>
                  </div>

                  {/* Course Details */}
                  <div className="mt-5">
                    <h2 className="text-xl font-bold text-gray-900">
                      {t("Cálculo Diferencial e Integral")}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {t("Preparación para examen parcial")}
                    </p>
                  </div>

                  {/* Tutor Details */}
                  <div className="mt-5 flex items-center justify-between rounded-xl bg-gray-50 p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 font-semibold text-white">
                        <span>U</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{t("Tutor asignado")}</p>
                        <p className="text-xs text-gray-500">{t("Estudiante de Ingeniería • 4to año")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-amber-500 text-xs font-semibold">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      <span>5.0</span>
                    </div>
                  </div>

                  {/* Session Schedule info */}
                  <div className="mt-4 flex items-center gap-2 text-xs font-medium text-gray-600 bg-primary-50/60 rounded-lg p-2.5">
                    <Clock className="h-4 w-4 text-primary-600" />
                    <span>{t("Hoy, 4:00 PM • Sala Virtual")}</span>
                  </div>

                  {/* Rating / Review quote */}
                  <div className="mt-5 border-t border-gray-100 pt-4 flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1 text-primary-700 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t("Valoración excelente")}
                    </span>
                    <span className="font-semibold text-gray-700">4.9 / 5.0 ★</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Benefits Section */}
      <section className="bg-gray-50/60 py-16 sm:py-24 border-y border-gray-100" id="beneficios">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {t("¿Por qué elegir UniTutor?")}
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              {t("Una experiencia diseñada para hacer el apoyo académico accesible, confiable y sin complicaciones.")}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Benefit 1 */}
            <div className="flex flex-col rounded-2xl border border-gray-100 bg-white p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600 mb-5">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">{t("Aprende sin frustración")}</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                {t("Resuelve dudas puntuales y comprende conceptos difíciles con explicaciones claras adaptadas a tu propio ritmo.")}
              </p>
            </div>

            {/* Benefit 2 */}
            <div className="flex flex-col rounded-2xl border border-gray-100 bg-white p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600 mb-5">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">{t("Acompañamiento entre pares")}</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                {t("Conecta con tutores que ya cursaron y dominaron las asignaturas que estás llevando en tu plan de estudios.")}
              </p>
            </div>

            {/* Benefit 3 */}
            <div className="flex flex-col rounded-2xl border border-gray-100 bg-white p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600 mb-5">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">{t("Coordinación transparente")}</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                {t("Consulta asignaturas activas, programa tus tutorías y da seguimiento a tus avances de manera ordenada.")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Target Audiences / Community Section */}
      <section className="py-16 sm:py-24 bg-white" id="comunidad">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {t("Pensado para toda la comunidad académica")}
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              {t("Cada rol cuenta con herramientas pensadas para facilitar el aprendizaje y la gestión del conocimiento.")}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* For Students */}
            <div className="relative flex flex-col justify-between rounded-2xl border-2 border-primary-100 bg-white p-8 shadow-sm transition hover:border-primary-300">
              <div>
                <div className="inline-flex rounded-md bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
                  {t("Estudiantes")}
                </div>
                <h3 className="mt-4 text-2xl font-bold text-gray-900">{t("Para Estudiantes")}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">
                  {t("Supera materias complejas, aclara dudas antes de los exámenes y alcanza tus metas con la guía de compañeros experimentados.")}
                </p>
              </div>
              <div className="mt-8 border-t border-gray-100 pt-5">
                <Link
                  to="/register"
                  className="inline-flex items-center text-sm font-semibold text-primary-600 hover:text-primary-700"
                >
                  {t("Comenzar ahora")}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* For Tutors */}
            <div className="relative flex flex-col justify-between rounded-2xl border-2 border-primary-100 bg-white p-8 shadow-sm transition hover:border-primary-300">
              <div>
                <div className="inline-flex rounded-md bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
                  {t("Tutores")}
                </div>
                <h3 className="mt-4 text-2xl font-bold text-gray-900">{t("Para Tutores")}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">
                  {t("Comparte tu vocación por la enseñanza, afianza tu dominio en las materias y suma experiencia enriquecedora a tu formación.")}
                </p>
              </div>
              <div className="mt-8 border-t border-gray-100 pt-5">
                <Link
                  to="/register"
                  className="inline-flex items-center text-sm font-semibold text-primary-600 hover:text-primary-700"
                >
                  {t("Empezar como tutor o estudiante")}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* For Institutions */}
            <div className="relative flex flex-col justify-between rounded-2xl border-2 border-primary-100 bg-white p-8 shadow-sm transition hover:border-primary-300">
              <div>
                <div className="inline-flex rounded-md bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
                  <School className="mr-1 h-3.5 w-3.5" />
                  {t("Administración")}
                </div>
                <h3 className="mt-4 text-2xl font-bold text-gray-900">{t("Para Instituciones")}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">
                  {t("Fortalece la permanencia estudiantil, supervisa materias impartidas y ofrece un canal formal de apoyo académico.")}
                </p>
              </div>
              <div className="mt-8 border-t border-gray-100 pt-5">
                <Link
                  to="/login"
                  className="inline-flex items-center text-sm font-semibold text-primary-600 hover:text-primary-700"
                >
                  {t("Acceso a la plataforma")}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-gradient-to-b from-gray-50/70 to-white py-16 sm:py-24 border-t border-gray-100" id="como-funciona">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {t("Tres pasos para comenzar")}
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              {t("El camino hacia un mejor rendimiento académico es más sencillo de lo que crees.")}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-white font-bold text-xl shadow-md shadow-primary-500/20 mb-5">
                <span>1</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900">{t("1. Crea tu cuenta")}</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                {t("Regístrate en pocos clics con tu correo institucional e indica tu institución educativa.")}
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-white font-bold text-xl shadow-md shadow-primary-500/20 mb-5">
                <span>2</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900">{t("2. Encuentra tu asignatura")}</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                {t("Explora las materias disponibles en tu institución y selecciona en cuál necesitas apoyo.")}
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-white font-bold text-xl shadow-md shadow-primary-500/20 mb-5">
                <span>3</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900">{t("3. Participa y avanza")}</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                {t("Conéctate a tus sesiones, trabaja tus dudas con tu tutor y logra el éxito en tus evaluaciones.")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final Call to Action Banner */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary-700 via-primary-600 to-primary-800 px-6 py-12 sm:px-12 sm:py-16 lg:px-16 text-center text-white shadow-xl">
            {/* Background elements */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-white/10 blur-2xl"></div>
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-64 w-64 rounded-full bg-primary-900/40 blur-2xl"></div>

            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                {t("¿Listo para impulsar tu aprendizaje?")}
              </h2>
              <p className="mt-4 text-base sm:text-lg text-primary-100">
                {t("Únete hoy a UniTutor y descubre una nueva forma de aprender y colaborar en la universidad.")}
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to={user ? "/dashboard" : "/register"}
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-white px-7 py-3.5 text-base font-semibold text-primary-700 shadow-md transition hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-700"
                >
                  {user ? t("Ir al Panel") : t("Crear cuenta")}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                {!user && (
                  <Link
                    to="/login"
                    className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-primary-400 bg-transparent px-7 py-3.5 text-base font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white"
                  >
                    {t("Iniciar sesión")}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 py-12 text-sm text-gray-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo and brief */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <span className="text-lg font-bold text-gray-900">UniTutor</span>
              </div>
              <p className="mt-2 text-xs text-gray-500 max-w-sm">
                {t("Plataforma de acompañamiento y tutorías académicas universitarias.")}
              </p>
            </div>

            {/* Quick links */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-medium">
              <Link to="/login" className="hover:text-primary-600 transition-colors">
                {t("Iniciar sesión")}
              </Link>
              <Link to="/register" className="hover:text-primary-600 transition-colors">
                {t("Registrarse")}
              </Link>
              <button
                type="button"
                onClick={scrollToTop}
                className="flex items-center gap-1 hover:text-primary-600 transition-colors cursor-pointer"
              >
                <ArrowUp className="h-4 w-4" />
                <span>{t("Volver arriba")}</span>
              </button>
            </div>

            {/* Language Selector in Footer */}
            <div className="flex items-center">
              <LanguageSelector />
            </div>
          </div>

          <div className="mt-8 border-t border-gray-200 pt-6 text-center text-xs text-gray-400">
            <p>
              UniTutor © {new Date().getFullYear()}. {t("Todos los derechos reservados.")}
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
