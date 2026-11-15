import test from 'node:test'
import assert from 'node:assert/strict'
import { routeFromLocation, routeUrl, restoreSession, sessionKey } from './planner-session.js'
import { defaults } from './mission.js'

test('planner routes encode selected sites and preserve detail history state', () => {
  const site = { id: 'site / 1', latitude: -88, longitude: 20 }
  const hash = routeUrl('detail', site)
  const route = routeFromLocation({ hash, search: '' }, { planner: { view: 'detail', selected: site, detailDate: '2027-03-06', detailTab: 'Sun & Earth' } })
  assert.equal(route.siteId, site.id)
  assert.equal(route.selected, site)
  assert.equal(route.detailDate, '2027-03-06')
  assert.equal(route.detailTab, 'Sun & Earth')
  assert.equal(routeFromLocation({ hash: '#home', search: '' }, { planner: { view: 'detail', selected: site } }).selected, undefined)
})
test('refresh restores the original analysis grid, mission, selected site and tab', () => {
  const site = { id: 'LSP-1' }
  const result = { analysisId: 'analysis-1', candidates: [site], sites: { ids: ['LSP-1'], x: [0], y: [0] } }
  const config = { ...defaults, stayDuration: 8 }
  const detail = { suitability: 87, hourly: [{ sunAzimuth: 20, sunElevation: 5 }] }
  const restored = restoreSession({ version: 1, state: { view: 'detail', config, selected: site, analyzedConfig: config, detail, detailDate: '2027-03-06', detailTab: '3D Terrain' }, result }, { view: 'detail', siteId: site.id })
  assert.equal(restored.result, result)
  assert.equal(restored.detail, detail)
  assert.equal(restored.selected, site)
  assert.equal(restored.config.stayDuration, 8)
  assert.equal(restored.detailTab, '3D Terrain')
  assert.equal(restored.detailDate, '2027-03-06')
})
test('unknown or missing analysis routes fall back without fabricating results', () => {
  assert.equal(restoreSession(null, { view: 'detail', siteId: 'missing' }).view, 'home')
  assert.equal(restoreSession(null, { view: 'candidates' }).view, 'home')
  assert.equal(restoreSession({ version: 99, state: { config: { stayDuration: 90 } } }, {}).config.stayDuration, defaults.stayDuration)
  const snapshot = { version: 1, state: { selected: { id: 'a' }, detail: { suitability: 90 } }, result: { candidates: [{ id: 'b' }] } }
  const restored = restoreSession(snapshot, { view: 'detail', siteId: 'b' })
  assert.equal(restored.selected.id, 'b')
  assert.equal(restored.detail, null)
})
test('the same browser tab reuses its session key', () => {
  const data = new Map()
  const storage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) }
  assert.equal(sessionKey(storage), sessionKey(storage))
})
