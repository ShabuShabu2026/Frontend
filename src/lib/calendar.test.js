import test from 'node:test'
import assert from 'node:assert/strict'
import { calendarDays, calendarMonth, clampCalendarStart, selectableLandingDate, firstCalendarMonth, lastCalendarMonth } from './calendar.js'

test('only January 8 2026 through December 19 2028 can be selected', () => {
  const january = calendarDays(2026 * 12), december = calendarDays(2028 * 12 + 11)
  assert.deepEqual(january.filter(day => day.disabled).map(day => day.day), [1,2,3,4,5,6,7])
  assert.equal(january[7].disabled, false)
  assert.equal(december[18].disabled, false)
  assert.deepEqual(december.filter(day => day.disabled).map(day => day.day), [20,21,22,23,24,25,26,27,28,29,30,31])
})
test('leap days and impossible manually entered dates are handled correctly', () => {
  assert.equal(calendarDays(2028 * 12 + 1).length, 29)
  assert.equal(selectableLandingDate('2028-02-29'), true)
  assert.equal(calendarDays(2027 * 12 + 1).length, 28)
  assert.equal(selectableLandingDate('2027-02-29'), false)
  assert.equal(selectableLandingDate('2027-02-30'), false)
  assert.equal(selectableLandingDate('2027-13-01'), false)
})
test('month navigation crosses years without displaying months outside the service years', () => {
  assert.equal(calendarMonth('2027-01-01') - 1, 2026 * 12 + 11)
  assert.equal(calendarMonth('2026-12-31') + 1, 2027 * 12)
  assert.equal(clampCalendarStart(calendarMonth('2026-01-08')), firstCalendarMonth)
  assert.equal(clampCalendarStart(calendarMonth('2028-12-19')) + 1, lastCalendarMonth)
  assert.equal(clampCalendarStart(2025 * 12), firstCalendarMonth)
  assert.equal(clampCalendarStart(2029 * 12), lastCalendarMonth - 1)
})
