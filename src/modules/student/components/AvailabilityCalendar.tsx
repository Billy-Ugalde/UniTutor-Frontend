import { useTranslations } from '@/i18n/useTranslations'
import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { TutorSlotRow } from '@/types/database.types'
import { parseISODate, toISODate } from '../utils/date-utils'

interface AvailabilityCalendarProps {
  slots: TutorSlotRow[]
  selectedDate: string | null
  onSelectDate: (date: string) => void
}

export function AvailabilityCalendar({ slots, selectedDate, onSelectDate }: AvailabilityCalendarProps) {
  const { t, locale } = useTranslations()

  const freeSlotsByDate = useMemo(() => {
    const map = new Map<string, number>()
    slots.forEach((slot) => {
      if (slot.available_spots > 0 && !slot.my_request_status) {
        map.set(slot.session_date, (map.get(slot.session_date) ?? 0) + 1)
      }
    })
    return map
  }, [slots])

  const allDates = useMemo(() => new Set(slots.map((slot) => slot.session_date)), [slots])

  const today = new Date()
  const todayISO = toISODate(today)
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)

  const [cursor, setCursor] = useState(() => {
    const anchor = selectedDate ?? slots[0]?.session_date
    const base = anchor ? parseISODate(anchor) : today
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leadingBlanks = (new Date(year, month, 1).getDay() + 6) % 7 // semana inicia en lunes

  // 1 de enero de 2024 fue lunes.
  const weekdayLabels = Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: 'short' }),
  )

  const canGoBack = cursor.getTime() > currentMonthStart.getTime()
  const monthLabel = cursor.toLocaleDateString(locale, { month: 'long', year: 'numeric' })

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-bold capitalize text-gray-900" aria-live="polite">
          {monthLabel}
        </h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            disabled={!canGoBack}
            aria-label={t("Mes anterior")}
            title={t("Mes anterior")}
            className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            aria-label={t("Mes siguiente")}
            title={t("Mes siguiente")}
            className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 cursor-pointer"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {weekdayLabels.map((label, index) => (
          <div key={index} className="py-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
            {label}
          </div>
        ))}

        {Array.from({ length: leadingBlanks }, (_, i) => (
          <div key={`blank-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const iso = toISODate(new Date(year, month, day))
          const freeCount = freeSlotsByDate.get(iso) ?? 0
          const hasAnySlot = allDates.has(iso)
          const isSelected = iso === selectedDate
          const isToday = iso === todayISO
          const isPast = iso < todayISO

          const fullDate = new Date(year, month, day).toLocaleDateString(locale, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })
          const ariaLabel = hasAnySlot
            ? `${fullDate}: ${t("{count} horarios disponibles", { count: freeCount })}`
            : `${fullDate}: ${t("Sin horarios disponibles")}`

          let stateClass = 'text-gray-300 cursor-default'
          if (isSelected) {
            stateClass = 'bg-primary-600 text-white shadow-sm cursor-pointer'
          } else if (hasAnySlot && freeCount > 0) {
            stateClass =
              'border border-green-200 bg-green-50 text-green-800 hover:bg-green-100 cursor-pointer font-semibold'
          } else if (hasAnySlot) {
            stateClass = 'border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 cursor-pointer'
          } else if (!isPast) {
            stateClass = 'text-gray-500'
          }

          return (
            <button
              key={iso}
              type="button"
              disabled={!hasAnySlot}
              onClick={() => onSelectDate(iso)}
              aria-label={ariaLabel}
              aria-pressed={isSelected}
              className={`relative flex h-11 flex-col items-center justify-center rounded-lg text-sm transition-colors ${stateClass} ${
                isToday && !isSelected ? 'ring-2 ring-primary-300' : ''
              }`}
            >
              {day}
              {freeCount > 0 && (
                <span
                  className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-green-500'}`}
                />
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-gray-100 pt-3 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
          {t("Con horarios libres")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-primary-600" />
          {t("Día seleccionado")}
        </span>
      </div>
    </div>
  )
}
