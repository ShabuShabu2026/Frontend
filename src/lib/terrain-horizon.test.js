import test from 'node:test'
import assert from 'node:assert/strict'
import { terrainHorizon } from './terrain-horizon.js'
import { projectSite } from './projection.js'

function fixture(longitude = 0) {
  const site = { latitude: -89, longitude }
  const point = projectSite(site.latitude, site.longitude)
  const terrain = { elevations: Array.from({ length: 11 }, () => Array(11).fill(0)), spacing: 100, referenceRadius: 1737400, geometry: { origin: { x: point.x - 500, y: point.y + 500 }, column_step: { x: 100, y: 0 }, row_step: { x: 0, y: -100 }, origin_reference: 'center of upper-left pixel', site_position: point } }
  return { site, terrain }
}
test('a flat spherical DEM has a slightly negative geometric horizon', () => {
  const { site, terrain } = fixture()
  const profile = terrainHorizon(terrain, site, 0, 90)
  assert.equal(profile.samples.length, 5)
  for (const sample of profile.samples) { assert.ok(sample.elevation < 0); assert.ok(sample.elevation > -.01) }
  assert.ok(profile.maxDistance <= 500)
})
test('a northern ridge raises the northern horizon by its actual angular height', () => {
  const { site, terrain } = fixture()
  terrain.elevations[3].fill(100)
  const profile = terrainHorizon(terrain, site, 0, 90)
  assert.ok(profile.samples[0].elevation > 25 && profile.samples[0].elevation < 28)
  assert.ok(profile.samples[1].elevation < .01)
  const raised = terrainHorizon(terrain, site, 10, 90)
  assert.ok(raised.samples[0].elevation < profile.samples[0].elevation)
})
test('polar grid bearings are converted to true north at other longitudes', () => {
  const { site, terrain } = fixture(90)
  terrain.elevations.forEach(line => { line[7] = 100 })
  const profile = terrainHorizon(terrain, site, 0, 90)
  assert.ok(profile.samples[0].elevation > 25)
  assert.ok(profile.samples[1].elevation < .01)
})
test('missing elevations create gaps instead of a fabricated skyline', () => {
  const { site, terrain } = fixture()
  terrain.elevations[3][5] = null
  const profile = terrainHorizon(terrain, site, 0, 90)
  assert.equal(profile.samples[0].elevation, null)
  assert.ok(Number.isFinite(profile.samples[1].elevation))
  terrain.elevations[5][5] = null
  assert.equal(terrainHorizon(terrain, site), null)
})
test('missing or ambiguous georeferencing cannot produce an invented horizon', () => {
  const { site, terrain } = fixture()
  assert.equal(terrainHorizon({ ...terrain, geometry: undefined }, site), null)
  assert.equal(terrainHorizon(terrain, site, -1), null)
  terrain.geometry.origin_reference = 'unknown'
  assert.equal(terrainHorizon(terrain, site), null)
})
