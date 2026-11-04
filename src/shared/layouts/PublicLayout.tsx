import { Link, Outlet } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useTranslations } from '@/i18n/useTranslations'
import { LanguageSelector } from '@/shared/components/LanguageSelector'

export function PublicLayout() {
  const { t } = useTranslations()

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary-50 to-primary-100">
      <header className="shrink-0 flex items-center justify-between px-4 py-2.5 sm:px-6 z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-lg border border-primary-200 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-primary-900 shadow-sm backdrop-blur hover:bg-white hover:text-primary-950 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("Volver al inicio")}
        </Link>
        <LanguageSelector />
      </header>
      <main className="flex-1 flex flex-col items-center p-3 sm:p-4">
        <Outlet />
      </main>
    </div>
  )
}
