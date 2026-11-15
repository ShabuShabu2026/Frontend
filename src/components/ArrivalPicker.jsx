import { useState } from 'react'
import { shortDate } from '../lib/presentation-labels.js'
import { calendarDays, calendarMonth, calendarYears, clampCalendarStart, firstCalendarMonth, lastCalendarMonth } from '../lib/calendar.js'

const monthNames = Array.from({ length: 12 }, (_, month) => new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, month, 1))))
export default function ArrivalPicker({ config, update, close }) {
  const [start, setStart] = useState(() => clampCalendarStart(calendarMonth(config.landingDate)))
  const [mode, setMode] = useState('days')
  const [column, setColumn] = useState(0)
  const active = start + column, year = Math.floor(active / 12)
  function open(kind, index) { setColumn(index); setMode(kind) }
  function selectMonth(month) { setStart(clampCalendarStart(year * 12 + month - column)); setMode('days') }
  function selectYear(nextYear) { setStart(clampCalendarStart(nextYear * 12 + active % 12 - column)); setMode('days') }
  const previousDisabled = mode === 'years' || (mode === 'months' ? year <= 2026 : start <= firstCalendarMonth)
  const nextDisabled = mode === 'years' || (mode === 'months' ? year >= 2028 : start >= lastCalendarMonth - 1)
  function move(direction) { setStart(current => clampCalendarStart(current + direction * (mode === 'months' ? 12 : 1))) }
  return <>
    <div className="popover-title"><h3>When do you want to arrive?</h3><button type="button" aria-label="Close arrival picker" onClick={close}>✕</button></div>
    <div className="arrival-flex"><span>Specific dates</span><div className="segmented">{[0, 1, 3, 7].map(range => <button type="button" className={config.searchRange === range ? 'active' : ''} key={range} onClick={() => update('searchRange', range)}>{range ? `±${range} days` : 'Exact'}</button>)}</div></div>
    <p className="calendar-range">Jan 8, 2026 – Dec 19, 2028</p>
    <div className="calendar-navigation">
      <button type="button" disabled={previousDisabled} aria-label={mode === 'months' ? 'Previous year' : 'Previous month'} onClick={() => move(-1)}>‹</button>
      {mode === 'days' ? <span aria-live="polite">Select an arrival date</span> : <button type="button" className="calendar-mode-back" onClick={() => setMode('days')}>← Back to dates</button>}
      <button type="button" disabled={nextDisabled} aria-label={mode === 'months' ? 'Next year' : 'Next month'} onClick={() => move(1)}>›</button>
    </div>
    {mode === 'days' && <div className="calendar-months">{[start, start + 1].map((monthIndex, index) => {
      const month = monthIndex % 12, currentYear = Math.floor(monthIndex / 12)
      return <section className="calendar-month" key={monthIndex} aria-label={`${monthNames[month]} ${currentYear}`}>
        <div className="calendar-month-heading"><button type="button" aria-label={`Choose month for calendar ${index + 1}`} onClick={() => open('months', index)}>{monthNames[month]} <span>⌄</span></button><button type="button" aria-label={`Choose year for calendar ${index + 1}`} onClick={() => open('years', index)}>{currentYear} <span>⌄</span></button></div>
        <div className="calendar-grid">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => <small key={i}>{day}</small>)}{Array.from({ length: new Date(Date.UTC(currentYear, month, 1)).getUTCDay() }, (_, i) => <span key={`blank-${i}`} />)}{calendarDays(monthIndex).map(({ date, day, disabled }) => <button type="button" key={date} aria-label={date} aria-pressed={config.landingDate === date} aria-current={config.landingDate === date ? 'date' : undefined} disabled={disabled} className={config.landingDate === date ? 'chosen' : ''} onClick={() => update('landingDate', date)}>{day}</button>)}</div>
      </section>
    })}</div>}
    {mode === 'months' && <section className="calendar-period-picker" aria-label="Choose month"><div className="calendar-period-heading"><h4>Choose month</h4><button type="button" aria-label="Choose year for month picker" onClick={() => setMode('years')}>{year} ⌄</button></div><div className="calendar-month-options">{monthNames.map((name, month) => <button type="button" key={name} aria-label={`${name} ${year}`} aria-pressed={active % 12 === month} onClick={() => selectMonth(month)}>{name}</button>)}</div></section>}
    {mode === 'years' && <section className="calendar-period-picker" aria-label="Choose year"><h4>Choose year</h4><div className="calendar-year-options">{calendarYears.map(option => <button type="button" key={option} aria-pressed={option === year} onClick={() => selectYear(option)}>{option}</button>)}</div></section>}
    <div className="popover-footer"><small aria-live="polite">Stay: {shortDate(config.landingDate)} · {config.stayDuration} days</small><button className="light-button" type="button" onClick={close}>Done</button></div>
  </>
}
