import assert from 'node:assert/strict'
import test from 'node:test'
import { defaults, objectives, includesOther, localWeights, updateMission, dateBounds, validateMission, changedSettings, redistributeWeights } from './mission.js'

test('specified defaults and date window', () => {
  assert.equal(defaults.landingDate, '2027-03-05')
  assert.equal(defaults.stayDuration, 6)
  assert.equal(defaults.missionType, 'Crewed')
  assert.equal(defaults.slopeLimit, 5)
  assert.equal(defaults.height, 1)
  assert.equal(defaults.searchRange, 7)
  assert.equal(defaults.uncrewedConstraints, false)
  assert.deepEqual(validateMission(defaults), [])
  assert.deepEqual(dateBounds(defaults), { min: '2027-01-08', max: '2027-12-18' })
  assert.equal(changedSettings(defaults), 0)
})
test('all objectives normalize with Other only for the three scored objectives', () => {
  assert.equal(objectives.length, 8)
  assert.equal(objectives.filter(includesOther).length, 3)
  for (const objective of objectives) {
    const weights = localWeights({ ...defaults, objective })
    assert.ok(Math.abs(Object.values(weights).reduce((sum, value) => sum + (value ?? 0), 0) - 1) < 1e-10)
    assert.equal(weights.Other === null, !includesOther(objective))
  }
})
test('mission changes update dependent priorities and sunlight ratio', () => {
  let config = updateMission(defaults, 'missionType', 'Uncrewed')
  assert.equal(config.priorities.Flatness, 3)
  assert.equal(config.priorities.Roughness, 3)
  config = updateMission(config, 'power', 'High')
  assert.equal(config.sunlightRatio, 80)
  assert.equal(config.priorities.Sunlight, 5)
  config = updateMission(config, 'communication', 'Critical')
  assert.equal(config.priorities.Communication, 5)
  assert.equal(changedSettings(config), 0)
  assert.equal(changedSettings({ ...config, slopeLimit: 6 }), 1)
})
test('invalid inputs and complete date windows are rejected', () => {
  for (const override of [{ landingDate: '2027-01-01' }, { landingDate: '2027-12-31' }, { stayDuration: 1.5 }, { stayDuration: 1e9 }, { slopeLimit: 16 }, { sunlightRatio: 101 }]) {
    assert.ok(validateMission({ ...defaults, ...override }).length > 0)
  }
})
test('uncrewed durations are required only when their constraints apply', () => {
  const config = { ...defaults, missionType: 'Uncrewed', uncrewedConstraints: true }
  assert.equal(validateMission(config).length, 2)
  assert.deepEqual(validateMission({ ...config, batteryEndurance: 0, maximumBlackout: 0 }), [])
  assert.deepEqual(validateMission({ ...config, missionType: 'Crewed' }), [])
})

test('changing an importance persists and redistributes normalized weights', () => {
  const initialWeights = localWeights(defaults)
  const next = updateMission(defaults, 'priorities', { ...defaults.priorities, Communication: 5 })
  assert.equal(next.priorities.Communication, 5)
  assert.equal(defaults.priorities.Communication, 3)
  const weights = localWeights(next)
  assert.ok(weights.Communication > initialWeights.Communication)
  for (const name of ['Flatness', 'Roughness', 'Sunlight']) assert.ok(weights[name] < initialWeights[name])
  assert.ok(Math.abs(Object.values(weights).reduce((sum, value) => sum + (value ?? 0), 0) - 1) < 1e-10)
  const lowered = updateMission(next, 'priorities', { ...next.priorities, Communication: 1 })
  assert.equal(lowered.priorities.Communication, 1)
  assert.ok(localWeights(lowered).Flatness > weights.Flatness)
})

test('percentage sliders preserve the selected position and rebalance every other slider', () => {
  const weights = localWeights(defaults)
  const next = redistributeWeights(weights, 'Communication', .5)
  assert.equal(next.Communication, .5)
  assert.ok(next.Flatness < weights.Flatness)
  assert.ok(next.Roughness < weights.Roughness)
  assert.equal(next.Other, null)
  assert.equal(next.Flatness / next.Sunlight, weights.Flatness / weights.Sunlight)
  assert.ok(Math.abs(Object.values(next).reduce((sum, value) => sum + (value ?? 0), 0) - 1) < 1e-10)
  const full = redistributeWeights(next, 'Communication', 1)
  assert.equal(full.Flatness, 0)
  const restored = redistributeWeights(full, 'Communication', .4)
  assert.ok(Math.abs(restored.Flatness - .2) < 1e-10)
  assert.deepEqual(localWeights({ ...defaults, manualWeights: restored }), restored)
  assert.equal(updateMission({ ...defaults, manualWeights: restored }, 'power', 'High').manualWeights, null)
})
