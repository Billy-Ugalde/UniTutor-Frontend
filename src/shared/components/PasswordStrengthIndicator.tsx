import { useTranslations } from '@/i18n/useTranslations'
import { Check, X } from 'lucide-react'
import { validatePassword } from '@/shared/utils/password'

interface PasswordStrengthIndicatorProps {
  password: string
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const { t } = useTranslations()

  if (!password) {
    return null
  }

  const { criteria, score, strength } = validatePassword(password)

  const strengthLabels = {
    weak: t("Débil"),
    medium: t("Media"),
    strong: t("Fuerte"),
  }

  const strengthColors = {
    weak: 'bg-red-500',
    medium: 'bg-amber-500',
    strong: 'bg-green-600',
  }

  const items = [
    { key: 'minLength', label: t("Mínimo 8 caracteres"), valid: criteria.minLength },
    { key: 'hasUppercase', label: t("Al menos una letra mayúscula (A-Z)"), valid: criteria.hasUppercase },
    { key: 'hasLowercase', label: t("Al menos una letra minúscula (a-z)"), valid: criteria.hasLowercase },
    { key: 'hasNumber', label: t("Al menos un número (0-9)"), valid: criteria.hasNumber },
    { key: 'hasSpecialChar', label: t("Al menos un carácter especial (!@#$%...)"), valid: criteria.hasSpecialChar },
  ]

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-700">{t("Seguridad de la contraseña:")}</span>
        <span className={`font-semibold ${
          strength === 'strong'
            ? 'text-green-800'
            : strength === 'medium'
            ? 'text-amber-800'
            : 'text-red-700'
        }`}>
          {strengthLabels[strength]}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-1.5 h-1.5">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={`rounded-full transition-all duration-300 ${
              score >= level ? strengthColors[strength] : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-2.5 gap-y-1 pt-1 text-[11px]">
        {items.map((item) => (
          <li
            key={item.key}
            className={`flex items-center gap-1.5 transition-colors ${
              item.valid ? 'text-emerald-950 font-bold' : 'text-gray-700 font-medium'
            }`}
          >
            {item.valid ? (
              <Check className="h-3.5 w-3.5 text-emerald-800 shrink-0" />
            ) : (
              <X className="h-3.5 w-3.5 text-gray-600 shrink-0" />
            )}
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
