import { objectives, scoreNames } from './mission.js'
import { requestJson } from './request.js'
import { createCandidateIndex, selectAreaCandidates } from './region-candidates.js'

const objectiveIds = ['GENERAL', 'POLAR_VOLATILES', 'PLANETARY_PROCESSES', 'IMPACT_HISTORY', 'ANCIENT_SUN', 'UNIQUE_OBSERVATION', 'EXPERIMENTAL_SCIENCE', 'EXPLORATION_RISKS']
const named = (values) => Object.fromEntries(scoreNames.map((name, i) => [name, values?.[i] ?? null]))
const missionInputs = (config) => ({
  missionType: config.missionType.toUpperCase(),
  powerRequirement: config.power.toUpperCase(),
  communicationDependency: config.communication.toUpperCase(),
  objective: objectiveIds[objectives.indexOf(config.objective)],
})
export function analysisPayload(config) {
  return {
    ...missionInputs(config), landingDate: config.landingDate, stayDays: config.stayDuration, limit: 20,
    advanced: {
      slopeConstraint: { enabled: config.slopeEnabled, maxDeg: config.slopeLimit },
      crewedSunlightConstraint: { enabled: config.crewedSunlight },
      uncrewedConstraints: {
        enabled: config.missionType === 'Uncrewed' && config.uncrewedConstraints,
        batteryEnduranceHours: config.batteryEndurance === '' ? null : config.batteryEndurance,
        maxCommBlackoutHours: config.maximumBlackout === '' ? null : config.maximumBlackout,
      },
      importanceWeights: scoreNames.map((name) => config.priorities[name]),
      requiredSunlightRatio: config.sunlightRatio,
      sunVisibilityCriterion: { Partial: 'PARTIAL', 'Half Disk': 'HALF_DISK', Full: 'FULL' }[config.sunCriterion],
      earthVisibilityCriterion: { 'Upper Edge': 'UPPER_EDGE', 'Center + Δ': 'CENTER_DELTA', Full: 'FULL' }[config.earthCriterion],
      heightM: config.height, landingDateSearchRangeDays: config.searchRange,
    },
  }
}
export const adaptSite = (site) => ({ ...site, id: site.siteId, latitude: site.lat, longitude: site.lon, status: site.passed === false ? 'Excluded' : { FEASIBLE: 'Feasible', MARGINAL: 'Marginal', EXCLUDED: 'Excluded' }[site.status] ?? site.status })
const visibilitySummary = (v) => ({ sunVisibility: v?.sunlightRatio, earthVisibility: v?.earthVisibleRatio, longestDarkness: v?.longestDarknessHours, longestBlackout: v?.longestCommBlackoutHours })
export function createApiServices({ baseUrl = import.meta.env?.VITE_API_BASE_URL || 'https://shabushabu.up.railway.app', fetchImpl = globalThis.fetch, retryDelays = [800, 2000] } = {}) {
  async function request(path, { signal, body, query, retries = retryDelays } = {}) {
    const params = new URLSearchParams(query)
    return requestJson(fetchImpl, `${baseUrl.replace(/\/$/, '')}${path}${params.size ? `?${params}` : ''}`, {
      method: body ? 'POST' : 'GET', signal,
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }, retries)
  }
  const summaries = new Map()
  return {
    async getSiteSummary({ analysisId, siteId }, { signal } = {}) {
      const key = JSON.stringify([analysisId, siteId])
      if (summaries.has(key)) return summaries.get(key)
      const data = await request(`/analyses/${encodeURIComponent(analysisId)}/sites/${encodeURIComponent(siteId)}`, { signal })
      const summary = { ...visibilitySummary(data.visibility), bestLandingDate: data.bestLandingDate }
      if (!signal?.aborted) { summaries.set(key, summary); if (summaries.size > 500) summaries.delete(summaries.keys().next().value) }
      return summary
    },
    async getWeights(config, { signal } = {}) {
      const data = await request('/weights', { signal, query: { ...missionInputs(config), importanceWeights: scoreNames.map((name) => config.priorities[name]).join(',') } })
      return { weights: named(data.normalizedWeights), priorities: named(data.importance) }
    },
    async analyze(config, { signal } = {}) {
      const data = await request('/analyses', { signal, body: analysisPayload(config) })
      const adapted = data.candidates.map(adaptSite)
      const index = createCandidateIndex({ ...data, candidates: adapted })
      const candidates = index && data.bbox ? selectAreaCandidates(index, data.bbox) : adapted
      return { ...data, candidates, weights: named(data.normalizedWeights), priorities: named(data.appliedImportance) }
    },
    async getRegion({ analysisId, bbox }, { signal } = {}) {
      const query = { bbox: [bbox.xmin, bbox.ymin, bbox.xmax, bbox.ymax].join(',') }
      const path = `/analyses/${encodeURIComponent(analysisId)}`
      // Recommendations reuse the analysis snapshot (all mission inputs).
      // Do not block the list on an expensive fine-grid response.
      const recommendations = await request(`${path}/recommendations`, { query: { ...query, limit: '20' }, signal, retries: [] })
      return { bbox, candidates: recommendations.recommendations.map(adaptSite) }
    },
    async getSiteDetails({ analysisId, siteId, landingDate }, { signal, onProgress } = {}) {
      const path = `/analyses/${encodeURIComponent(analysisId)}/sites/${encodeURIComponent(siteId)}`
      const emit = (patch) => { if (!signal?.aborted) onProgress?.(patch) }
      const overviewPromise = request(path, { signal }).then((data) => {
        const patch = {
          suitability: data.suitability, passed: data.passed, exclusionReasons: data.exclusionReasons,
          scores: Object.fromEntries(scoreNames.map((name) => [name, data.scores?.[name.toLowerCase()] ?? null])),
          priorities: named(data.importance), weights: named(data.normalizedWeights),
          slope: data.terrain?.slopeDeg, roughness: data.terrain?.roughnessM, bestLandingDate: data.bestLandingDate,
          overviewStatus: 'ready',
        }
        emit(patch); return patch
      }).catch((error) => { emit({ overviewStatus: 'error', overviewError: error.message }); throw error })
      const terrainPromise = request(`${path}/terrain`, { signal }).then((data) => {
        const terrain = { elevations: data.heights ?? data.elevationsM, spacing: data.resolution_m ?? data.gridSpacingM, coordinateSystem: data.coordinate_system?.crs_wkt ?? data.crs, geometry: data.coordinate_system, referenceRadius: data.elevation_reference?.radius_m ?? 1737400 }
        const hasSamples = Array.isArray(terrain.elevations) && terrain.elevations.some((row) => Array.isArray(row) && row.some(Number.isFinite))
        const patch = { terrain: hasSamples ? terrain : null, terrainStatus: hasSamples ? 'ready' : 'empty', terrainError: '' }
        emit(patch); return patch
      }).catch((error) => {
        const patch = { terrain: null, terrainStatus: 'error', terrainError: error.message }
        emit(patch); return patch
      })
      const visibilityPromise = request(`${path}/visibility`, { signal, query: { landingDate } }).then((data) => {
        const patch = {
          ...visibilitySummary(data.visibility), visibilityPassed: data.passed, visibilityStatus: 'ready', visibilityError: '',
          hourly: (data.hourly ?? []).map((sample) => ({ ...sample, sunAzimuth: sample.sunAzimuthDeg, sunElevation: sample.sunElevationDeg, earthAzimuth: sample.earthAzimuthDeg, earthElevation: sample.earthElevationDeg, sunDiskFraction: sample.sunDiskVisibleFraction })),
        }
        emit(patch); return patch
      }).catch((error) => {
        const patch = { visibilityStatus: 'error', visibilityError: error.message, hourly: [] }
        emit(patch); return patch
      })
      const [overview, terrain, visibility] = await Promise.allSettled([overviewPromise, terrainPromise, visibilityPromise])
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      if (overview.status === 'rejected') throw overview.reason
      const data = { ...overview.value, ...terrain.value, ...visibility.value }
      return { ...data, notices: [data.terrainError, data.visibilityError].filter(Boolean) }
    },
  }
}
export const apiServices = createApiServices()
