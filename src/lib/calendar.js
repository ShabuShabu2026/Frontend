export const landingDateRange = { min: '2026-01-08', max: '2028-12-19' }
export const calendarYears = [2026, 2027, 2028]
export const firstCalendarMonth = 2026 * 12
export const lastCalendarMonth = 2028 * 12 + 11
export function calendarMonth(value) {
  const [year, month] = String(value).split('-').map(Number)
  return Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12 ? Math.max(firstCalendarMonth, Math.min(lastCalendarMonth, year * 12 + month - 1)) : 2027 * 12 + 2
}
// Two visible months always stay inside January 2026–December 2028.
export const clampCalendarStart = value => Math.max(firstCalendarMonth, Math.min(lastCalendarMonth - 1, value))
export function selectableLandingDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < landingDateRange.min || value > landingDateRange.max) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}
export function calendarDays(monthIndex) {
  const year = Math.floor(monthIndex / 12), month = monthIndex % 12
  return Array.from({ length: new Date(Date.UTC(year, month + 1, 0)).getUTCDate() }, (_, i) => {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
    return { day: i + 1, date, disabled: !selectableLandingDate(date) }
  })
}
