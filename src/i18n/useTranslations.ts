import { useCallback } from 'react'
import { translate, type TranslationKey, type TranslationParams } from './core'
import { useLanguageStore } from './store'

export function useTranslations() {
  const language = useLanguageStore((state) => state.language)
  const setLanguage = useLanguageStore((state) => state.setLanguage)
  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams) => translate(language, key, params),
    [language],
  )
  return { t, language, setLanguage, locale: language === 'es' ? 'es-CR' : 'en-US' }
}
