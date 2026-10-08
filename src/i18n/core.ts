import es from './Lang/es.json'
import en from './Lang/en.json'

export type Language = 'es' | 'en'
export type TranslationKey = keyof typeof es
export type TranslationParams = Record<string, string | number>

export function resolveLanguage(value: unknown): Language {
  return value === 'en' ? 'en' : 'es'
}

export function translate(language: Language, key: string, params: TranslationParams = {}): string {
  const dictionary: Record<string, string> = language === 'en' ? en : es
  const fallback: Record<string, string> = es
  const message = Object.hasOwn(dictionary, key) ? dictionary[key]
    : Object.hasOwn(fallback, key) ? fallback[key] : key
  return message.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.hasOwn(params, name) ? String(params[name]) : placeholder,
  )
}
