import { objectives } from './mission.js'

// Display names only: the API continues receiving the original mission values.
export const scoreLabel = (name) => ({ Communication: 'Earth link', Other: 'Mission goal' }[name] ?? name)
export const objectiveLabels = ['General exploration', 'Water-ice prospecting', 'Geology & sampling', 'Impact history', 'Ancient Sun', 'Universe & space observation', 'Technology demo', 'Exploration risks']
export const objectiveLabel = (value) => objectiveLabels[objectives.indexOf(value)] ?? value
export const powerLabel = (value) => value === 'Normal' ? 'Medium' : value
export const communicationLabel = (value) => ({ Independent: 'Independent', Normal: 'Preferred', Critical: 'Required' }[value] ?? value)
export const missionLabel = (value) => value === 'Uncrewed' ? 'Robotic mission' : 'Crewed mission'
export const shortDate = (value, year = false) => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', ...(year ? { year: 'numeric' } : {}), timeZone: 'UTC' }).format(new Date(value)) : '—'
export const fitLabel = (site) => site.passed === false ? 'Excluded' : site.suitability == null ? '—' : site.suitability >= 75 ? 'Great' : site.suitability >= 50 ? 'Fair' : 'Low'
