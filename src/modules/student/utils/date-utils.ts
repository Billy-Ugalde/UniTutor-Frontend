/** Convierte 'YYYY-MM-DD' en una fecha local (evita el desfase UTC de `new Date(string)`). */
export function parseISODate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Convierte una fecha local en 'YYYY-MM-DD'. */
export function toISODate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Recorta 'HH:MM:SS' a 'HH:MM'. */
export function formatTime(value: string): string {
  return value.substring(0, 5)
}
