import { useId } from 'react'
import { Languages } from 'lucide-react'
import { resolveLanguage } from '@/i18n/core'
import { useTranslations } from '@/i18n/useTranslations'

export function LanguageSelector() {
  const id = useId()
  const { t, language, setLanguage } = useTranslations()
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Languages className="h-4 w-4 text-primary-600" aria-hidden="true" />
      <label htmlFor={id} className="sr-only">{t('Idioma')}</label>
      <select
        id={id}
        value={language}
        onChange={(event) => setLanguage(resolveLanguage(event.target.value))}
        className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option value="es" lang="es">Español</option>
        <option value="en" lang="en">English</option>
      </select>
    </div>
  )
}
