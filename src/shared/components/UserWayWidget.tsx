import { useEffect } from 'react'
import { useLanguageStore } from '@/i18n/store'

export interface UserWayWidgetProps {
  accountId?: string
  position?: string | number
}

declare global {
  interface Window {
    UserWay?: {
      changeLanguage?: (lang: string) => void
      widgetOpen?: () => void
      widgetClose?: () => void
      [key: string]: unknown
    }
  }
}

export const USERWAY_SCRIPT_ID = 'userway-widget-script'

export function UserWayWidget({ accountId, position }: UserWayWidgetProps = {}) {
  const currentLanguage = useLanguageStore((s) => s.language)
  const resolvedAccountId = accountId ?? import.meta.env.VITE_USERWAY_ACCOUNT_ID
  const resolvedPosition = position ?? import.meta.env.VITE_USERWAY_POSITION

  useEffect(() => {
    if (!resolvedAccountId) {
      if (import.meta.env.DEV) {
        console.info(
          '[UserWay] VITE_USERWAY_ACCOUNT_ID no está configurado. El widget de accesibilidad se inicializará cuando se defina un ID de cuenta.',
        )
      }
      return
    }

    let script = document.getElementById(USERWAY_SCRIPT_ID) as HTMLScriptElement | null

    if (!script) {
      script = document.createElement('script')
      script.id = USERWAY_SCRIPT_ID
      script.src = 'https://cdn.userway.org/widget.js'
      script.setAttribute('data-account', resolvedAccountId)
      if (resolvedPosition) {
        script.setAttribute('data-position', String(resolvedPosition))
      }
      script.setAttribute('data-language', currentLanguage)
      script.async = true
      document.body.appendChild(script)
    }
  }, [resolvedAccountId, resolvedPosition, currentLanguage])

  useEffect(() => {
    if (!resolvedAccountId) return

    if (window.UserWay && typeof window.UserWay.changeLanguage === 'function') {
      window.UserWay.changeLanguage(currentLanguage)
    }
  }, [currentLanguage, resolvedAccountId])

  return null
}
