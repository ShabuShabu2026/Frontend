export const objectives = [
  'General',
  'Understanding the character and origin of lunar polar volatiles',
  'Understanding planetary processes',
  'Interpreting the impact history of the Earth-Moon system',
  'Revealing the record of the ancient sun and our astronomical environment',
  'Observing the universe and the local space environment from a unique location',
  'Conducting experimental science in the lunar environment',
  'Investigating and mitigating exploration risks',
]
export const scoreNames = ['Communication', 'Flatness', 'Roughness', 'Sunlight', 'Other']
export const defaults = {
  landingDate: '2027-03-05', stayDuration: 6, missionType: 'Crewed', objective: 'General',
  power: 'Normal', communication: 'Normal', slopeEnabled: true, slopeLimit: 5,
  crewedSunlight: true, uncrewedConstraints: false, batteryEndurance: '', maximumBlackout: '',
  sunlightRatio: 50, sunCriterion: 'Half Disk', earthCriterion: 'Center + Δ',
  height: 1, searchRange: 7,
  priorities: { Communication: 3, Flatness: 5, Roughness: 5, Sunlight: 3, Other: 3 },
}
export const includesOther = (objective) => objectives.slice(1, 4).includes(objective)
export function updateMission(current, key, value) {
  const next = { ...current, [key]: value, priorities: { ...(key === 'priorities' ? value : current.priorities) } }
  if (['missionType', 'power', 'communication', 'objective', 'priorities'].includes(key)) next.manualWeights = null
  if (key === 'missionType') next.priorities.Flatness = next.priorities.Roughness = value === 'Crewed' ? 5 : 3
  if (key === 'power') {
    next.priorities.Sunlight = { Low: 1, Normal: 3, High: 5 }[value]
    next.sunlightRatio = { Low: 30, Normal: 50, High: 80 }[value]
  }
  if (key === 'communication') next.priorities.Communication = { Independent: 1, Normal: 3, Critical: 5 }[value]
  if (key === 'objective' && includesOther(value)) next.priorities.Other = 3
  return next
}
export function localWeights(config) {
  if (config.manualWeights) return config.manualWeights
  const names = scoreNames.filter((name) => name !== 'Other' || includesOther(config.objective))
  const total = names.reduce((sum, name) => sum + config.priorities[name], 0)
  return Object.fromEntries(scoreNames.map((name) => [name, names.includes(name) ? config.priorities[name] / total : null]))
}
// Keep the selected weight exact and share the remainder proportionally.
export function redistributeWeights(weights, selected, value) {
  const target = Math.max(0, Math.min(1, value))
  const others = scoreNames.filter((name) => name !== selected && weights[name] != null)
  const total = others.reduce((sum, name) => sum + weights[name], 0)
  return Object.fromEntries(scoreNames.map((name) => [name,
    name === selected ? target : weights[name] == null ? null :
      (1 - target) * (total > 0 ? weights[name] / total : 1 / others.length),
  ]))
}
const dateAt = (offset) => new Date(Date.UTC(2027, 0, 1 + offset)).toISOString().slice(0, 10)
export function dateBounds(config) {
  const range = Number(config.searchRange) || 0
  const duration = Math.min(365, Math.max(1, Number(config.stayDuration) || 1))
  return { min: dateAt(range), max: dateAt(364 - duration - range) }
}
export function validateMission(config) {
  const errors = []
  const bounds = dateBounds(config)
  if (!Number.isInteger(config.stayDuration) || config.stayDuration < 1 || config.stayDuration > 364) errors.push('Stay Duration must be a positive integer that fits within the 2027 analysis window.')
  if (!config.landingDate || config.landingDate < bounds.min || config.landingDate > bounds.max) errors.push('The landing date, stay duration and search range must fit within January 1–December 31, 2027.')
  if (config.slopeLimit < 0 || config.slopeLimit > 15 || !Number.isFinite(config.slopeLimit)) errors.push('The slope limit must be between 0° and 15°.')
  if (!Number.isFinite(config.sunlightRatio) || config.sunlightRatio < 0 || config.sunlightRatio > 100) errors.push('Required Sunlight Ratio must be between 0% and 100%.')
  if (config.missionType === 'Uncrewed' && config.uncrewedConstraints) {
    if (config.batteryEndurance === '' || !Number.isFinite(config.batteryEndurance) || config.batteryEndurance < 0) errors.push('Enter Battery Endurance in hours.')
    if (config.maximumBlackout === '' || !Number.isFinite(config.maximumBlackout) || config.maximumBlackout < 0) errors.push('Enter Maximum Communication Blackout in hours.')
  }
  return errors
}
export function changedSettings(config) {
  const keys = ['slopeEnabled', 'slopeLimit', 'sunlightRatio', 'sunCriterion', 'earthCriterion', 'height', 'searchRange']
  if (config.missionType === 'Crewed') keys.push('crewedSunlight')
  else keys.push('uncrewedConstraints', 'batteryEndurance', 'maximumBlackout')
  const baseline = updateMission(updateMission(updateMission(defaults, 'missionType', config.missionType), 'power', config.power), 'communication', config.communication)
  const manualChanges = config.manualWeights ? scoreNames.filter((name) => config.manualWeights[name] != null && Math.abs(config.manualWeights[name] - localWeights(baseline)[name]) > 1e-9).length : null
  return keys.filter((key) => config[key] !== baseline[key]).length + (manualChanges ?? scoreNames.filter((name) => (name !== 'Other' || includesOther(config.objective)) && config.priorities[name] !== baseline.priorities[name]).length)
}
export const percent = (value) => value == null ? '—' : `${(value * 100).toFixed(1)}%`
export const metric = (value, unit = '') => value == null ? '—' : `${typeof value === 'number' ? Number(value.toFixed(4)) : value}${unit}`
