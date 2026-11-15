import { includesOther, localWeights, scoreNames } from '../lib/mission.js'

// Presentation fixtures only; replace this adapter when the analysis API is connected.
const locations = [[30,25],[21,36],[26,55],[32,68],[46,58],[68,36],[79,65],[43,87],[68,82],[57,20]]
const analyses = new Map()
let sequence = 0
const clamp = (value) => Math.max(0, Math.min(1, value))
const dateOffset = (date, offset) => {
  const result = new Date(`${date}T00:00:00Z`)
  result.setUTCDate(result.getUTCDate() + offset)
  return result.toISOString().slice(0, 10)
}
function detailsFor(config, index, date = config.landingDate) {
  const hours = config.stayDuration * 24
  const dateShift = Math.round((Date.parse(date) - Date.parse(config.landingDate)) / 86400000)
  const continuous = config.missionType === 'Crewed' && config.crewedSunlight
  const hourly = Array.from({ length: hours }, (_, hour) => {
    const phase = hour / 18 + index * .4 + dateShift * .2
    const sunVisible = continuous || Math.sin(phase) > -.8 + index * .015
    const earthVisible = Math.sin(hour / 10 + index + dateShift * .3) > -.45
    return { time: new Date(Date.parse(`${date}T00:00:00Z`) + hour * 3600000).toISOString(), sunVisible, earthVisible, sunDiskFraction: sunVisible ? 1 : 0, sunAzimuth: Number(((hour * .5 + 60 + index * 7) % 360).toFixed(1)), sunElevation: Number((sunVisible ? 4 + Math.sin(phase) * 2 : -1).toFixed(1)), earthAzimuth: Number(((hour * .2 + 120 + index * 4) % 360).toFixed(1)), earthElevation: Number((earthVisible ? 5 + Math.sin(phase) : -2).toFixed(1)) }
  })
  const longest = (key) => { let run = 0, max = 0; for (const sample of hourly) { run = sample[key] ? 0 : run + 1; max = Math.max(max, run) } return max }
  const sunVisibility = hourly.filter((h) => h.sunVisible).length / hours
  const earthVisibility = hourly.filter((h) => h.earthVisible).length / hours
  const longestDarkness = longest('sunVisible'), longestBlackout = longest('earthVisible')
  const slope = Number(((config.slopeEnabled ? config.slopeLimit : 15) * (.14 + index * .075)).toFixed(2))
  const limit = config.slopeEnabled ? config.slopeLimit : 15
  const scores = {
    Communication: clamp(.5 * earthVisibility + .5 * (1 - longestBlackout / hours)),
    Flatness: limit === 0 ? 1 : clamp(1 - slope / limit),
    Roughness: clamp(.9 - index * .027),
    Sunlight: clamp(.5 * Math.min(1, config.sunlightRatio === 0 ? 1 : sunVisibility / (config.sunlightRatio / 100)) + .5 * (1 - longestDarkness / hours)),
    Other: includesOther(config.objective) ? clamp(.88 - index * .031) : null,
  }
  const weights = localWeights(config)
  const suitability = Number((100 * scoreNames.reduce((sum, name) => sum + (weights[name] ?? 0) * (scores[name] ?? 0), 0)).toFixed(1))
  const passed = !(config.missionType === 'Uncrewed' && config.uncrewedConstraints && (longestDarkness > config.batteryEndurance || longestBlackout > config.maximumBlackout))
  const exclusionReasons = passed ? [] : [longestDarkness > config.batteryEndurance && 'Battery endurance exceeded.', longestBlackout > config.maximumBlackout && 'Maximum communication blackout exceeded.'].filter(Boolean)
  const tagNames = { Communication: 'Good Earth visibility', Flatness: 'Flat terrain', Roughness: 'Low roughness', Sunlight: 'High sunlight', Other: 'Objective match' }
  const tags = scoreNames.filter((name) => scores[name] != null).sort((a,b) => scores[b] - scores[a]).slice(0,2).map((name) => tagNames[name])
  const elevations = Array.from({ length: 25 }, (_, r) => Array.from({ length: 25 }, (_, c) => {
    const x = (c - 12) / 8, y = (r - 12) / 8, radius = Math.hypot(x,y)
    return Number((1500 + 180 * Math.exp(-((radius - .8) ** 2) * 12) - 140 * Math.exp(-radius * radius * 5) + 20 * Math.sin(x * 5 + index) * Math.cos(y * 4)).toFixed(1))
  }))
  return { suitability, passed, exclusionReasons, status: index > 7 ? 'Marginal' : 'Feasible', scores, priorities: { ...config.priorities, Other: includesOther(config.objective) ? config.priorities.Other : null }, weights, slope, roughness: Number((.18 + index * .035).toFixed(2)), sunVisibility, earthVisibility, longestDarkness, longestBlackout, bestLandingDate: config.searchRange ? dateOffset(config.landingDate, Math.min(config.searchRange, index % 4)) : null, tags, hourly, terrain: { elevations, spacing: 80, coordinateSystem: 'Local terrain' } }
}
export const presentationServices = {
  async getWeights(config) { return { priorities: config.priorities, weights: localWeights(config) } },
  async analyze(config) {
    const analysisId = `presentation-${++sequence}`
    const snapshot = structuredClone(config)
    analyses.set(analysisId, snapshot)
    const mapSites = locations.map(([mapXPercent,mapYPercent], index) => {
      const data = detailsFor(snapshot,index)
      return { id: `LSP-${String(347 + index * 17).padStart(4,'0')}`, latitude: Number((-89.3 + index * .19).toFixed(3)), longitude: Number((24.6 + index * 13.7).toFixed(3)), mapXPercent, mapYPercent, ...data, index }
    })
    const candidates = mapSites.filter((site) => site.passed).sort((a,b) => b.suitability - a.suitability).map((site,index) => ({ ...site, rank:index+1 }))
    return { analysisId, candidates, mapSites, mapImageUrl: '/figma/listimgImage2.png', weights: localWeights(snapshot), priorities: snapshot.priorities, warnings: [] }
  },
  async getSiteDetails({ analysisId, siteId, landingDate }) {
    const config = analyses.get(analysisId)
    if (!config) throw new Error('Run an analysis to view this site.')
    const index = (Number(siteId.slice(4)) - 347) / 17
    return detailsFor(config, index, landingDate)
  },
}
