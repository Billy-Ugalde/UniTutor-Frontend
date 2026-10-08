import { create } from 'zustand'
import { resolveLanguage, type Language } from './core'

export const LANGUAGE_STORAGE_KEY = 'unitutor_language'

function initialLanguage(): Language {
  try {
    return resolveLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY))
  } catch {
    return 'es'
  }
}

export const useLanguageStore = create<{
  language: Language
  setLanguage: (language: Language) => void
}>((set) => ({
  language: initialLanguage(),
  setLanguage: (value) => {
    const language = resolveLanguage(value)
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
    } catch {
      // Language switching remains available when browser storage is blocked.
    }
    set({ language })
  },
}))

function updateDocumentLanguage(language: Language) {
  document.documentElement.lang = language
}

if (typeof document !== 'undefined') {
  updateDocumentLanguage(useLanguageStore.getState().language)
  useLanguageStore.subscribe(({ language }) => updateDocumentLanguage(language))
}
